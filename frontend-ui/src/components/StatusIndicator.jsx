export default function StatusIndicator({ active }) {
  return (
    <span className={`badge ${active ? "badge-success" : "badge-danger"}`}>
      <span className={`badge-dot ${active ? "pulse" : ""}`} />
      {active ? "Monitoring Active" : "Monitoring Inactive"}
    </span>
  );
}
