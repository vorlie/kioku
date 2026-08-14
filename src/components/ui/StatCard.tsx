interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
}

export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon">
        {icon}
      </div>
      <div>
        <div className="stat-card__value">
          {value}
        </div>
        <div className="stat-card__label">
          {label}
        </div>
      </div>
    </div>
  );
}
