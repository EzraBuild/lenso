const COLS = ["Laptop webcam", "Phone-cam apps", "Lenso"] as const;

const ROWS: [string, string, string, string][] = [
  ["Picture", "720p, soft", "Up to 4K, usually paid", "Up to 4K, free"],
  ["Price", "Built in", "Subscription", "Free, forever"],
  ["Watermark", "None", "On the free tier", "Never"],
  ["Needs a Mac", "No", "Sometimes", "No"],
  ["Needs OBS", "No", "Often", "No"],
  ["Internet", "No", "Account sign-in", "No, same Wi-Fi"],
  ["Source", "Closed", "Closed", "Open on GitHub"],
];

export function Compare() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse font-mono text-[12px]">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="w-[22%] py-3 pr-4 text-[10px] font-normal tracking-[0.14em] text-dim uppercase" />
            {COLS.map((c, i) => (
              <th
                key={c}
                className={`py-3 pr-4 text-[10px] font-normal tracking-[0.14em] uppercase ${i === 2 ? "bg-card px-4 text-fg" : "text-dim"}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([k, a, b, c]) => (
            <tr key={k} className="border-b border-line">
              <td className="py-3 pr-4 text-dim">{k}</td>
              <td className="py-3 pr-4 text-muted">{a}</td>
              <td className="py-3 pr-4 text-muted">{b}</td>
              <td className="bg-card px-4 py-3 text-fg">
                <span className="mr-2 inline-block h-1.5 w-1.5 bg-fg align-middle" />
                {c}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
