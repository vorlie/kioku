use std::sync::{Arc, Mutex};
use tiny_http::{Response, Server, StatusCode};

const CALLBACK_PORT: u16 = 42819;
const CLIENT_ID: &str = "45193";

pub struct AuthServer {
    server: Arc<Mutex<Option<Server>>>,
    token: Arc<Mutex<Option<String>>>,
    state: String,
}

impl AuthServer {
    pub fn new() -> Self {
        Self {
            server: Arc::new(Mutex::new(None)),
            token: Arc::new(Mutex::new(None)),
            state: Self::generate_state(),
        }
    }

    fn generate_state() -> String {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let mut state = String::new();
        for _ in 0..24 {
            state.push(char::from_digit(rng.gen_range(0..16), 16).unwrap());
        }
        state
    }

    pub fn start(&mut self) -> Result<String, String> {
        let token = Arc::clone(&self.token);
        let state = self.state.clone();
        let server_arc = Arc::clone(&self.server);

        eprintln!("Attempting to start auth server on port {}", CALLBACK_PORT);

        let server = Server::http(&format!("127.0.0.1:{}", CALLBACK_PORT))
            .map_err(|e| {
                eprintln!("Failed to start server: {}", e);
                format!("Failed to start server on port {}: {}. Port may already be in use.", CALLBACK_PORT, e)
            })?;

        eprintln!("Server started successfully");

        // Store the server in the Arc
        *server_arc.lock().unwrap() = Some(server);

        let auth_url = format!(
            "https://anilist.co/api/v2/oauth/authorize?client_id={}&response_type=token&state={}",
            CLIENT_ID, state
        );

        eprintln!("OAuth URL generated: {}", auth_url);

        // Spawn a task to handle requests
        let token_clone = Arc::clone(&token);
        let state_clone = state.clone();

        std::thread::spawn(move || {
            eprintln!("Auth server thread started");
            // Take the server out of the Arc
            let server = server_arc.lock().unwrap().take();
            if let Some(server) = server {
                eprintln!("Server listening for requests");
                for mut request in server.incoming_requests() {
                    let url = request.url();
                    let method = request.method();

                    eprintln!("Received request: {} {}", method, url);

                    if method == &tiny_http::Method::Get && url == "/anilist/callback" {
                        // OAuth implicit-flow fragments are intentionally not sent in HTTP
                        // requests. This page forwards the fragment to the local server.
                        let html = r#"<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Kioku - Authorization</title>
    <style>
        :root {
            --bg: #1e1b19;
            --surface: #282421;
            --text: #f4f1eb;
            --text-muted: #8c827a;
            --accent: #d27b7b;
            --success: #b85c5c;
            --error: #f38ba8;
            --border: #332e2a;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            margin: 0 auto 24px;
            animation: spin 1s linear infinite;
        }
        h1 {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 8px 0;
        }
        p {
            font-size: 14px;
            color: var(--text-muted);
            margin: 0;
            line-height: 1.5;
        }
        .status--success h1 { color: var(--success); }
        .status--error h1 { color: var(--error); }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="app-card" class="card">
        <div id="visual-indicator" class="spinner"></div>
        <h1 id="title">Authorizing</h1>
        <p id="message">Completing sign-in flow, please wait…</p>
    </div>

    <script>
        const card = document.getElementById('app-card');
        const indicator = document.getElementById('visual-indicator');
        const title = document.getElementById('title');
        const message = document.getElementById('message');

        fetch('/anilist/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: window.location.hash.slice(1)
        })
        .then(async (response) => {
            indicator.style.display = 'none';
            if (response.ok) {
                card.className = 'card status--success';
                title.textContent = 'Sign-In Successful';
                message.textContent = 'Your token was securely transferred to the app. You may close this browser window safely now.';
            } else {
                card.className = 'card status--error';
                title.textContent = 'Sign-In Failed';
                message.textContent = `Could not exchange token: ${await response.text()}`;
            }
        })
        .catch(() => {
            indicator.style.display = 'none';
            card.className = 'card status--error';
            title.textContent = 'Connection Error';
            message.textContent = 'Failed to connect to the local authentication server. Please run the setup step again.';
        });
    </script>
</body>
</html>"#;
                        let response = Response::from_string(html)
                            .with_status_code(StatusCode(200))
                            .with_header(tiny_http::Header::from_bytes(
                                &b"Content-Type"[..],
                                &b"text/html; charset=utf-8"[..],
                            ).unwrap());
                        let _ = request.respond(response);
                    } else if method == &tiny_http::Method::Post && url == "/anilist/token" {
                        let mut body = String::new();
                        if let Err(error) = request.as_reader().read_to_string(&mut body) {
                            eprintln!("Failed to read OAuth callback: {}", error);
                            let _ = request.respond(Response::from_string("Invalid callback").with_status_code(StatusCode(400)));
                            continue;
                        }

                        let access_token = Self::parse_token_from_hash(&body, &state_clone);

                        if let Some(token) = access_token {
                            eprintln!("Token extracted successfully");
                            *token_clone.lock().unwrap() = Some(token);
                            
                            let _ = request.respond(Response::from_string("Sign-in successful"));
                            eprintln!("Success response sent");
                            break;
                        } else {
                            eprintln!("Failed to parse token from hash");
                            let _ = request.respond(Response::from_string("Invalid OAuth callback").with_status_code(StatusCode(400)));
                        }
                    } else {
                        // 404 for other routes
                        let response = Response::from_string("Not Found")
                            .with_status_code(StatusCode(404));
                        let _ = request.respond(response);
                    }
                }
            } else {
                eprintln!("Server was None in thread");
            }
        });

        Ok(auth_url)
    }

    fn parse_token_from_hash(hash: &str, expected_state: &str) -> Option<String> {
        let params: std::collections::HashMap<String, String> =
            url::form_urlencoded::parse(hash.as_bytes()).into_owned().collect();

        // Verify state
        if params.get("state") != Some(&expected_state.to_string()) {
            eprintln!("OAuth callback state did not match the expected value");
            return None;
        }

        // Extract access token
        params.get("access_token").map(|s| s.to_string())
    }

    pub fn get_token(&self) -> Option<String> {
        self.token.lock().unwrap().clone()
    }

    pub fn stop(&mut self) {
        *self.server.lock().unwrap() = None;
    }
}

impl Default for AuthServer {
    fn default() -> Self {
        Self::new()
    }
}
