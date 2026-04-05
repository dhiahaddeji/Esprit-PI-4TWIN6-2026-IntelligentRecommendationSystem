export default function StatCard({ title, value, pill }) {
  return (
    <div className="statCard">
      <div className="statTop">
        <div className="statIcon" />
        <div className="statPill">{pill}</div>
      </div>
      <div className="statValue">{value}</div>
      <div className="statTitle">{title}</div>
    </div>
  );
}
