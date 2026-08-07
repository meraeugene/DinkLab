"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck2,
  CircleDollarSign,
  Landmark,
  Percent,
  ReceiptText,
} from "lucide-react";
import type {
  RevenueShareDashboardData,
  RevenueShareEntry,
} from "@/types/admin/revenueShare";

type PaymentFilter = "ALL" | RevenueShareEntry["paymentStatus"];
type TimingFilter = "ALL" | RevenueShareEntry["timing"];
type ChartInterval = "WEEK" | "MONTH";
type RevenueTrendPoint = {
  bookingValue: number;
  earnedShare: number;
  key: string;
  label: string;
  projectedShare: number;
  recordedPayment: number;
  reservationCount: number;
};
type PaymentDistributionItem = {
  count: number;
  percentage: number;
  status: RevenueShareEntry["paymentStatus"];
};

const REVENUE_PAGE_SIZE = 20;

export function RevenueShareDashboard({
  data,
}: {
  data: RevenueShareDashboardData;
}) {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [chartInterval, setChartInterval] = useState<ChartInterval>("WEEK");
  const [chartMonth, setChartMonth] = useState(
    () => buildMonthOptions(data.entries)[0]?.key || "all",
  );
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [timingFilter, setTimingFilter] = useState<TimingFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const monthOptions = useMemo(() => buildMonthOptions(data.entries), [data.entries]);
  const monthEntries = useMemo(
    () =>
      selectedMonth === "all"
        ? data.entries
        : data.entries.filter(
            (entry) => getManilaMonthKey(entry.startAt) === selectedMonth,
          ),
    [data.entries, selectedMonth],
  );
  const entries = useMemo(
    () =>
      monthEntries.filter(
        (entry) =>
          (paymentFilter === "ALL" ||
            entry.paymentStatus === paymentFilter) &&
          (timingFilter === "ALL" || entry.timing === timingFilter),
      ),
    [monthEntries, paymentFilter, timingFilter],
  );
  const chartEntries = useMemo(
    () =>
      data.entries.filter(
        (entry) =>
          (paymentFilter === "ALL" ||
            entry.paymentStatus === paymentFilter) &&
          (timingFilter === "ALL" || entry.timing === timingFilter),
      ),
    [data.entries, paymentFilter, timingFilter],
  );
  const totals = useMemo(() => summarizeEntries(entries), [entries]);
  const totalPages = Math.max(1, Math.ceil(entries.length / REVENUE_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageEntries = entries.slice(
    (safePage - 1) * REVENUE_PAGE_SIZE,
    safePage * REVENUE_PAGE_SIZE,
  );
  const revenueTrend = useMemo(
    () =>
      buildRevenueTrend(
        chartInterval === "WEEK" && chartMonth !== "all"
          ? chartEntries.filter(
              (entry) => getManilaMonthKey(entry.startAt) === chartMonth,
            )
          : chartEntries,
        chartInterval === "WEEK" ? "week" : "month",
      ),
    [chartEntries, chartInterval, chartMonth],
  );
  const paymentDistribution = useMemo(
    () => buildPaymentDistribution(entries),
    [entries],
  );
  const percentageLabel = `${data.commissionRate * 100}%`;

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-lime-300">
            Private revenue dashboard
          </p>
          <h2 className="mt-2 font-display text-2xl font-black text-white">
            Booking value and {percentageLabel} share
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Confirmed bookings only. Cancelled, rejected, and pending bookings
            are excluded. Commission is calculated from each booking&apos;s full
            price. It becomes earned only after the booking is completed and
            fully paid.
          </p>
        </div>
        <label className="grid w-full gap-2 text-xs font-bold text-zinc-500 sm:w-64">
          Reporting month
          <select
            className="h-11 cursor-pointer rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition hover:border-white/25 focus:border-lime-300/45"
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All bookings</option>
            {monthOptions.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-3 lg:grid-cols-[auto_1fr] lg:items-center">
        <div>
          <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.14em] text-zinc-600">
            Payment
          </p>
          <div className="flex flex-wrap gap-2">
            {(["ALL", "PAID", "PARTIAL", "UNPAID"] as PaymentFilter[]).map(
              (filter) => (
                <RevenueFilterButton
                  active={paymentFilter === filter}
                  key={filter}
                  label={filter === "ALL" ? "All payments" : formatFilterLabel(filter)}
                  onClick={() => {
                    setPaymentFilter(filter);
                    setCurrentPage(1);
                  }}
                />
              ),
            )}
          </div>
        </div>
        <div className="lg:justify-self-end">
          <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.14em] text-zinc-600 lg:text-right">
            Timing
          </p>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {(["ALL", "COMPLETED", "UPCOMING"] as TimingFilter[]).map(
              (filter) => (
                <RevenueFilterButton
                  active={timingFilter === filter}
                  key={filter}
                  label={filter === "ALL" ? "All timing" : formatFilterLabel(filter)}
                  onClick={() => {
                    setTimingFilter(filter);
                    setCurrentPage(1);
                  }}
                />
              ),
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RevenueMetric
          icon={<CircleDollarSign className="h-5 w-5" />}
          label="Confirmed booking value"
          note={`${totals.reservationCount} reservation${totals.reservationCount === 1 ? "" : "s"}`}
          value={formatRevenuePeso(totals.bookingValue)}
        />
        <RevenueMetric
          icon={<Percent className="h-5 w-5" />}
          label={`Your projected ${percentageLabel}`}
          note="All confirmed bookings, including upcoming and unpaid"
          value={formatRevenuePeso(totals.developerShare)}
        />
        <RevenueMetric
          accent="lime"
          icon={<Landmark className="h-5 w-5" />}
          label={`Earned ${percentageLabel}`}
          note="Completed and fully paid bookings only"
          value={formatRevenuePeso(totals.earnedShare)}
        />
        <RevenueMetric
          icon={<ReceiptText className="h-5 w-5" />}
          label="Recorded payments"
          note="Downpayments or full payments recorded"
          value={formatRevenuePeso(totals.recordedPayment)}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryChip
          label={`Projected Dink Lab ${100 - data.commissionRate * 100}%`}
          value={formatRevenuePeso(totals.venueShare)}
        />
        <SummaryChip
          label="Completed"
          value={`${totals.completedCount} reservations`}
        />
        <SummaryChip
          label="Upcoming"
          value={`${totals.upcomingCount} reservations`}
        />
        <SummaryChip
          label="Court schedules"
          value={`${totals.scheduleCount} items`}
        />
      </div>

      <div className="mt-6">
        <RevenueTrendChart
          interval={chartInterval}
          monthOptions={monthOptions}
          points={revenueTrend}
          onIntervalChange={setChartInterval}
          onMonthChange={setChartMonth}
          selectedMonth={chartMonth}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RevenueSplitChart
            commissionRate={data.commissionRate}
            developerShare={totals.developerShare}
            venueShare={totals.venueShare}
          />
          <PaymentDistributionChart distribution={paymentDistribution} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
        <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-sm font-black text-white">
              Transparent booking breakdown
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Every amount below contributes to the totals above.
            </p>
          </div>
          <div className="text-xs text-zinc-600 sm:text-right">
            <p>
              Showing {entries.length ? (safePage - 1) * REVENUE_PAGE_SIZE + 1 : 0}–{Math.min(safePage * REVENUE_PAGE_SIZE, entries.length)} of {entries.length}
            </p>
            <p className="mt-1">Updated {formatManilaDateTime(data.generatedAt)}</p>
          </div>
        </div>

        {entries.length ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[19%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead className="border-b border-white/10 bg-white/[0.035]">
                <tr className="font-display text-[0.65rem] font-black uppercase tracking-[0.14em] text-zinc-500">
                  <th className="px-3 py-3" scope="col">Customer</th>
                  <th className="px-3 py-3" scope="col">Schedule</th>
                  <th className="px-3 py-3" scope="col">Timing</th>
                  <th className="px-3 py-3" scope="col">Payment</th>
                  <th className="px-3 py-3 text-right" scope="col">Booking value</th>
                  <th className="px-3 py-3 text-right" scope="col">Recorded</th>
                  <th className="px-3 py-3 text-right" scope="col">Projected 5%</th>
                  <th className="px-3 py-3 text-right" scope="col">Earned 5%</th>
                  <th className="px-3 py-3 text-right" scope="col">Projected venue 95%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {pageEntries.map((entry) => (
                  <RevenueRow entry={entry} key={entry.bookingGroupId} />
                ))}
              </tbody>
              <tfoot className="border-t border-lime-300/20 bg-lime-300/[0.04]">
                <tr className="text-sm font-black text-white">
                  <td className="px-3 py-4" colSpan={4}>Selected-period total</td>
                  <td className="px-3 py-4 text-right">{formatRevenuePeso(totals.bookingValue)}</td>
                  <td className="px-3 py-4 text-right text-zinc-400">{formatRevenuePeso(totals.recordedPayment)}</td>
                  <td className="px-3 py-4 text-right">{formatRevenuePeso(totals.developerShare)}</td>
                  <td className="px-3 py-4 text-right text-lime-200">{formatRevenuePeso(totals.earnedShare)}</td>
                  <td className="px-3 py-4 text-right">{formatRevenuePeso(totals.venueShare)}</td>
                </tr>
              </tfoot>
              </table>
            </div>
            {totalPages > 1 ? (
              <RevenuePagination
                currentPage={safePage}
                totalPages={totalPages}
                onChange={setCurrentPage}
              />
            ) : null}
          </div>
        ) : (
          <p className="px-4 py-12 text-center text-sm text-zinc-600">
            No confirmed bookings exist for this period.
          </p>
        )}
      </div>
    </section>
  );
}

function RevenueMetric({
  accent = "neutral",
  icon,
  label,
  note,
  value,
}: {
  accent?: "lime" | "neutral";
  icon: React.ReactNode;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article
      className={[
        "rounded-2xl border p-4",
        accent === "lime"
          ? "border-lime-300/25 bg-lime-300/[0.07]"
          : "border-white/10 bg-zinc-950",
      ].join(" ")}
    >
      <div className={accent === "lime" ? "text-lime-200" : "text-zinc-500"}>
        {icon}
      </div>
      <p className="mt-4 text-xs font-bold text-zinc-500">{label}</p>
      <p className="mt-2 font-display text-xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-600">{note}</p>
    </article>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3">
      <CalendarCheck2 className="h-4 w-4 shrink-0 text-zinc-600" />
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-600">{label}</p>
        <p className="mt-1 text-sm font-bold text-zinc-300">{value}</p>
      </div>
    </div>
  );
}

function RevenueTrendChart({
  interval,
  monthOptions,
  onIntervalChange,
  onMonthChange,
  points,
  selectedMonth,
}: {
  interval: ChartInterval;
  monthOptions: Array<{ key: string; label: string }>;
  onIntervalChange: (interval: ChartInterval) => void;
  onMonthChange: (month: string) => void;
  points: RevenueTrendPoint[];
  selectedMonth: string;
}) {
  const chart = buildMountainChart(points);
  const health = getBookingHealth(points);
  const bookingValue = points.reduce(
    (total, point) => total + point.bookingValue,
    0,
  );
  const recordedPayment = points.reduce(
    (total, point) => total + point.recordedPayment,
    0,
  );
  const collectionRate = bookingValue
    ? Math.min(100, (recordedPayment / bookingValue) * 100)
    : 0;
  const selectedMonthLabel =
    monthOptions.find((month) => month.key === selectedMonth)?.label ||
    "the selected month";

  return (
    <figure className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-sm font-black text-white">
            Booking value trend
          </h3>
          <p className="mt-1 text-xs text-zinc-600">
            {interval === "WEEK"
              ? `Calendar weeks clipped to ${selectedMonthLabel} only.`
              : "Month-by-month history across all confirmed bookings."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {interval === "WEEK" ? (
            <label>
              <span className="sr-only">Weekly chart month</span>
              <select
                className="h-10 cursor-pointer rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-bold text-white outline-none transition hover:border-white/25 focus:border-lime-300/45"
                value={selectedMonth}
                onChange={(event) => onMonthChange(event.target.value)}
              >
                {monthOptions.length ? (
                  monthOptions.map((month) => (
                    <option key={month.key} value={month.key}>
                      {month.label}
                    </option>
                  ))
                ) : (
                  <option value="all">No booking months</option>
                )}
              </select>
            </label>
          ) : null}
          <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
            {(["WEEK", "MONTH"] as ChartInterval[]).map((option) => (
              <button
                aria-pressed={interval === option}
                className={[
                  "h-8 cursor-pointer rounded-lg px-3 text-[0.65rem] font-black uppercase tracking-[0.1em] transition",
                  interval === option
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:bg-white/[0.08] hover:text-white",
                ].join(" ")}
                key={option}
                onClick={() => onIntervalChange(option)}
                type="button"
              >
                {option === "WEEK" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
          <div className={`rounded-xl border px-3 py-2 ${health.tone}`}>
            <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] opacity-70">
              Booking health
            </p>
            <p className="mt-0.5 text-sm font-black">
              {health.label}
              {health.change === null ? "" : ` ${formatSignedPercentage(health.change)}`}
            </p>
          </div>
        </div>
      </div>

      {points.length ? (
        <div className="mt-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <ChartTotal
              colorClass="bg-cyan-300"
              label="Booking value"
              value={formatRevenuePeso(bookingValue)}
            />
            <ChartTotal
              colorClass="bg-lime-300"
              label="Recorded payments"
              value={formatRevenuePeso(recordedPayment)}
            />
            <ChartTotal
              colorClass="bg-white/30"
              label="Collection rate"
              value={`${Math.round(collectionRate)}%`}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <svg
              aria-label="Mountain chart comparing booking value and recorded payments by period"
              className="h-auto min-w-[620px]"
              role="img"
              viewBox={`0 0 ${chart.width} ${chart.height}`}
            >
              <defs>
                <linearGradient id="bookingMountain" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(103 232 249)" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="rgb(103 232 249)" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="paymentMountain" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(190 242 100)" stopOpacity="0.36" />
                  <stop offset="100%" stopColor="rgb(190 242 100)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {chart.gridLines.map((line) => (
                <g key={line.value}>
                  <line
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 6"
                    x1={chart.left}
                    x2={chart.width - chart.right}
                    y1={line.y}
                    y2={line.y}
                  />
                  <text
                    fill="rgb(82 82 91)"
                    fontSize="10"
                    textAnchor="end"
                    x={chart.left - 8}
                    y={line.y + 3}
                  >
                    {formatCompactPeso(line.value)}
                  </text>
                </g>
              ))}

              <path d={chart.bookingAreaPath} fill="url(#bookingMountain)" />
              <path d={chart.paymentAreaPath} fill="url(#paymentMountain)" />
              <path
                d={chart.bookingLinePath}
                fill="none"
                stroke="rgb(103 232 249)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <path
                d={chart.paymentLinePath}
                fill="none"
                stroke="rgb(190 242 100)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />

              {chart.points.map((point) => (
                <g key={point.key}>
                  <circle cx={point.x} cy={point.bookingY} fill="rgb(9 9 11)" r="5" stroke="rgb(103 232 249)" strokeWidth="3">
                    <title>{`${point.label} booking value: ${formatRevenuePeso(point.bookingValue)}`}</title>
                  </circle>
                  <circle cx={point.x} cy={point.paymentY} fill="rgb(9 9 11)" r="5" stroke="rgb(190 242 100)" strokeWidth="3">
                    <title>{`${point.label} recorded payments: ${formatRevenuePeso(point.recordedPayment)}`}</title>
                  </circle>
                  <text
                    fill="rgb(161 161 170)"
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                    x={point.x}
                    y={chart.height - 8}
                  >
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {points.map((point) => (
              <div
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"
                key={point.key}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-white">{point.label}</p>
                  <p className="text-[0.6rem] text-zinc-600">
                    {point.reservationCount} booking{point.reservationCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="mt-2 flex items-center justify-between gap-2 text-[0.65rem] text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    Value
                  </span>
                  <strong className="text-cyan-200">
                    {formatRevenuePeso(point.bookingValue)}
                  </strong>
                </p>
                <p className="mt-1.5 flex items-center justify-between gap-2 text-[0.65rem] text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-lime-300" />
                    Recorded
                  </span>
                  <strong className="text-lime-200">
                    {formatRevenuePeso(point.recordedPayment)}
                  </strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-zinc-600">
          No booking data matches these filters.
        </p>
      )}
    </figure>
  );
}

function ChartTotal({
  colorClass,
  label,
  value,
}: {
  colorClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
      <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-zinc-600">
        <span className={`h-2 w-2 rounded-full ${colorClass}`} />
        {label}
      </p>
      <p className="mt-1.5 font-display text-base font-black text-white">{value}</p>
    </div>
  );
}

function RevenueSplitChart({
  commissionRate,
  developerShare,
  venueShare,
}: {
  commissionRate: number;
  developerShare: number;
  venueShare: number;
}) {
  const developerPercentage = commissionRate * 100;
  const venuePercentage = 100 - developerPercentage;

  return (
    <figure className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <h3 className="font-display text-sm font-black text-white">
        Projected revenue split
      </h3>
      <p className="mt-1 text-xs text-zinc-600">Based on confirmed booking value.</p>
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row xl:flex-row">
        <div
          aria-label={`${developerPercentage}% developer share and ${venuePercentage}% venue share`}
          className="relative h-32 w-32 shrink-0 rounded-full"
          role="img"
          style={{
            background: `conic-gradient(rgb(190 242 100) 0 ${developerPercentage}%, rgba(255, 255, 255, 0.12) ${developerPercentage}% 100%)`,
          }}
        >
          <div className="absolute inset-4 grid place-items-center rounded-full bg-zinc-950 text-center">
            <div>
              <p className="font-display text-xl font-black text-lime-200">
                {developerPercentage}%
              </p>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-zinc-600">
                Your share
              </p>
            </div>
          </div>
        </div>
        <figcaption className="w-full space-y-3">
          <ChartValueLegend
            colorClass="bg-lime-300"
            label={`Your ${developerPercentage}%`}
            value={formatRevenuePeso(developerShare)}
          />
          <ChartValueLegend
            colorClass="bg-white/20"
            label={`Dink Lab ${venuePercentage}%`}
            value={formatRevenuePeso(venueShare)}
          />
        </figcaption>
      </div>
    </figure>
  );
}

function PaymentDistributionChart({
  distribution,
}: {
  distribution: PaymentDistributionItem[];
}) {
  const colors: Record<RevenueShareEntry["paymentStatus"], string> = {
    PAID: "bg-lime-300",
    PARTIAL: "bg-amber-300",
    UNPAID: "bg-red-300",
  };

  return (
    <figure className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <h3 className="font-display text-sm font-black text-white">
        Payment status
      </h3>
      <p className="mt-1 text-xs text-zinc-600">
        Reservation count under the active filters.
      </p>
      <div className="mt-5 space-y-4">
        {distribution.map((item) => (
          <div key={item.status}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-400">
                {formatFilterLabel(item.status)}
              </span>
              <span className="text-zinc-600">
                {item.count} ({Math.round(item.percentage)}%)
              </span>
            </div>
            <div
              aria-label={`${formatFilterLabel(item.status)}: ${item.count} reservations, ${Math.round(item.percentage)}%`}
              className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
              role="img"
            >
              <div
                className={`h-full rounded-full ${colors[item.status]}`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

function ChartValueLegend({
  colorClass,
  label,
  value,
}: {
  colorClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`} />
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-zinc-600">
          {label}
        </p>
        <p className="mt-1 text-sm font-black text-zinc-200">{value}</p>
      </div>
    </div>
  );
}

function RevenueFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        "h-9 cursor-pointer rounded-lg border px-3 text-xs font-bold transition",
        active
          ? "border-lime-300/35 bg-lime-300/12 text-lime-100"
          : "border-white/10 bg-white/[0.025] text-zinc-500 hover:border-white/25 hover:bg-white/[0.07] hover:text-white",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function RevenuePagination({
  currentPage,
  onChange,
  totalPages,
}: {
  currentPage: number;
  onChange: (page: number) => void;
  totalPages: number;
}) {
  return (
    <nav
      aria-label="Revenue booking pages"
      className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-4 py-4"
    >
      <button
        className="h-9 cursor-pointer rounded-lg border border-white/10 px-3 text-xs font-bold text-zinc-400 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        disabled={currentPage === 1}
        type="button"
        onClick={() => onChange(currentPage - 1)}
      >
        Previous
      </button>
      {buildPaginationItems(currentPage, totalPages).map((item) =>
        typeof item === "number" ? (
          <button
            aria-current={item === currentPage ? "page" : undefined}
            className={[
              "grid h-9 min-w-9 cursor-pointer place-items-center rounded-lg border px-2 text-xs font-black transition",
              item === currentPage
                ? "border-lime-300/35 bg-lime-300/12 text-lime-100"
                : "border-white/10 text-zinc-500 hover:border-white/25 hover:bg-white/[0.07] hover:text-white",
            ].join(" ")}
            key={item}
            type="button"
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ) : (
          <span className="px-1 text-xs text-zinc-700" key={item}>
            …
          </span>
        ),
      )}
      <button
        className="h-9 cursor-pointer rounded-lg border border-white/10 px-3 text-xs font-bold text-zinc-400 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        disabled={currentPage === totalPages}
        type="button"
        onClick={() => onChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}

function RevenueRow({ entry }: { entry: RevenueShareEntry }) {
  return (
    <tr className="align-top transition hover:bg-white/[0.025]">
      <td className="px-3 py-4">
        <p className="truncate text-sm font-bold text-white">{entry.customerName}</p>
        <p className="mt-1 truncate text-xs text-zinc-600">
          {entry.customerEmail || "Guest - no email"}
        </p>
      </td>
      <td className="px-3 py-4">
        <p className="text-xs font-bold text-zinc-300">{entry.courtNames.join(" + ")}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-600">
          {formatManilaDateTime(entry.startAt)}
          {" – "}
          {formatManilaTime(entry.endAt)}
        </p>
        <p className="mt-1 text-[0.65rem] text-zinc-700">
          {entry.scheduleCount} schedule item{entry.scheduleCount === 1 ? "" : "s"}
        </p>
      </td>
      <td className="px-3 py-4">
        <span
          className={[
            "inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em]",
            entry.timing === "COMPLETED"
              ? "border-lime-300/30 text-lime-200"
              : "border-cyan-300/25 text-cyan-200",
          ].join(" ")}
        >
          {entry.timing === "COMPLETED" ? "Completed" : "Upcoming"}
        </span>
      </td>
      <td className="px-3 py-4">
        <span className={paymentStatusClass(entry.paymentStatus)}>
          {entry.paymentStatus === "PARTIAL" ? "Partial" : entry.paymentStatus.toLowerCase()}
        </span>
      </td>
      <td className="px-3 py-4 text-right text-sm font-black text-white">
        {formatRevenuePeso(entry.bookingValue)}
      </td>
      <td className="px-3 py-4 text-right text-sm text-zinc-400">
        {formatRevenuePeso(entry.recordedPayment)}
      </td>
      <td className="px-3 py-4 text-right text-sm font-bold text-zinc-300">
        {formatRevenuePeso(entry.developerShare)}
      </td>
      <td className="px-3 py-4 text-right text-sm font-black text-lime-200">
        {formatRevenuePeso(entry.earnedShare)}
      </td>
      <td className="px-3 py-4 text-right text-sm font-bold text-zinc-300">
        {formatRevenuePeso(entry.venueShare)}
      </td>
    </tr>
  );
}

function paymentStatusClass(status: RevenueShareEntry["paymentStatus"]) {
  const tone =
    status === "PAID"
      ? "border-lime-300/30 text-lime-200"
      : status === "PARTIAL"
        ? "border-amber-300/30 text-amber-200"
        : "border-red-300/25 text-red-200";

  return [
    "inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em]",
    tone,
  ].join(" ");
}

function summarizeEntries(entries: RevenueShareEntry[]) {
  return entries.reduce(
    (totals, entry) => ({
      bookingValue: totals.bookingValue + entry.bookingValue,
      completedCount:
        totals.completedCount + (entry.timing === "COMPLETED" ? 1 : 0),
      developerShare: totals.developerShare + entry.developerShare,
      earnedShare: totals.earnedShare + entry.earnedShare,
      recordedPayment: totals.recordedPayment + entry.recordedPayment,
      reservationCount: totals.reservationCount + 1,
      scheduleCount: totals.scheduleCount + entry.scheduleCount,
      upcomingCount:
        totals.upcomingCount + (entry.timing === "UPCOMING" ? 1 : 0),
      venueShare: totals.venueShare + entry.venueShare,
    }),
    {
      bookingValue: 0,
      completedCount: 0,
      developerShare: 0,
      earnedShare: 0,
      recordedPayment: 0,
      reservationCount: 0,
      scheduleCount: 0,
      upcomingCount: 0,
      venueShare: 0,
    },
  );
}

function buildRevenueTrend(
  entries: RevenueShareEntry[],
  period: "month" | "week",
): RevenueTrendPoint[] {
  const groupedEntries = new Map<
    string,
    Omit<RevenueTrendPoint, "key" | "label">
  >();

  for (const entry of entries) {
    const key =
      period === "week"
        ? getManilaWeekKey(entry.startAt)
        : getManilaMonthKey(entry.startAt);
    const current = groupedEntries.get(key) || {
      bookingValue: 0,
      earnedShare: 0,
      projectedShare: 0,
      recordedPayment: 0,
      reservationCount: 0,
    };

    groupedEntries.set(key, {
      bookingValue: current.bookingValue + entry.bookingValue,
      earnedShare: current.earnedShare + entry.earnedShare,
      projectedShare: current.projectedShare + entry.developerShare,
      recordedPayment: current.recordedPayment + entry.recordedPayment,
      reservationCount: current.reservationCount + 1,
    });
  }

  return [...groupedEntries.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-8)
    .map(([key, values]) => ({
      ...values,
      key,
      label:
        period === "week" ? formatShortWeekLabel(key) : formatShortMonthLabel(key),
    }));
}

function buildPaymentDistribution(
  entries: RevenueShareEntry[],
): PaymentDistributionItem[] {
  const statuses = ["PAID", "PARTIAL", "UNPAID"] as const;

  return statuses.map((status) => {
    const count = entries.filter((entry) => entry.paymentStatus === status).length;
    return {
      count,
      percentage: entries.length ? (count / entries.length) * 100 : 0,
      status,
    };
  });
}

function buildMountainChart(points: RevenueTrendPoint[]) {
  const width = 720;
  const height = 270;
  const left = 58;
  const right = 18;
  const top = 16;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximumValue = Math.max(
    1,
    ...points.flatMap((point) => [point.bookingValue, point.recordedPayment]),
  );
  const roundedMaximum = getRoundedChartMaximum(maximumValue);
  const chartPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? left + plotWidth / 2
        : left + (index / (points.length - 1)) * plotWidth;
    return {
      ...point,
      bookingY: top + (1 - point.bookingValue / roundedMaximum) * plotHeight,
      paymentY:
        top + (1 - point.recordedPayment / roundedMaximum) * plotHeight,
      x,
    };
  });
  const bookingLinePath = buildChartLinePath(
    chartPoints.map((point) => ({ x: point.x, y: point.bookingY })),
  );
  const paymentLinePath = buildChartLinePath(
    chartPoints.map((point) => ({ x: point.x, y: point.paymentY })),
  );
  const baseline = height - bottom;

  return {
    bookingAreaPath: buildChartAreaPath(bookingLinePath, chartPoints, baseline),
    bookingLinePath,
    bottom,
    gridLines: Array.from({ length: 5 }, (_, index) => ({
      value: roundedMaximum * (1 - index / 4),
      y: top + (index / 4) * plotHeight,
    })),
    height,
    left,
    paymentAreaPath: buildChartAreaPath(paymentLinePath, chartPoints, baseline),
    paymentLinePath,
    points: chartPoints,
    right,
    width,
  };
}

function buildChartLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildChartAreaPath(
  linePath: string,
  points: Array<{ x: number }>,
  baseline: number,
) {
  if (!points.length) return "";
  return `${linePath} L ${points.at(-1)?.x || 0} ${baseline} L ${points[0].x} ${baseline} Z`;
}

function getRoundedChartMaximum(maximumValue: number) {
  const magnitude = 10 ** Math.floor(Math.log10(maximumValue));
  return Math.ceil(maximumValue / magnitude) * magnitude;
}

function getBookingHealth(points: RevenueTrendPoint[]) {
  if (points.length < 2) {
    return {
      change: null,
      label: "Not enough data",
      tone: "border-white/10 bg-white/[0.03] text-zinc-400",
    };
  }

  const previousValue = points.at(-2)?.bookingValue || 0;
  const latestValue = points.at(-1)?.bookingValue || 0;
  const change = previousValue
    ? ((latestValue - previousValue) / previousValue) * 100
    : latestValue
      ? 100
      : 0;

  if (change >= 25) {
    return {
      change,
      label: "Booming",
      tone: "border-lime-300/30 bg-lime-300/[0.08] text-lime-200",
    };
  }
  if (change >= 5) {
    return {
      change,
      label: "Growing",
      tone: "border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-200",
    };
  }
  if (change > -5) {
    return {
      change,
      label: "Steady",
      tone: "border-white/10 bg-white/[0.03] text-zinc-300",
    };
  }
  return {
    change,
    label: "Cooling",
    tone: "border-amber-300/25 bg-amber-300/[0.07] text-amber-200",
  };
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  const visiblePages = [...new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
  const items: Array<number | string> = [];

  for (const page of visiblePages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) {
      items.push(`ellipsis-${previous}`);
    }
    items.push(page);
  }

  return items;
}

function formatFilterLabel(value: string) {
  return `${value.charAt(0)}${value.slice(1).toLowerCase()}`;
}

function buildMonthOptions(entries: RevenueShareEntry[]) {
  return [...new Set(entries.map((entry) => getManilaMonthKey(entry.startAt)))]
    .sort((first, second) => second.localeCompare(first))
    .map((key) => ({ key, label: formatMonthLabel(key) }));
}

function getManilaMonthKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "Asia/Manila",
    year: "numeric",
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  return `${year}-${month}`;
}

function getManilaDayKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Manila",
    year: "numeric",
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

function getManilaWeekKey(value: string) {
  const dayKey = getManilaDayKey(value);
  const date = new Date(`${dayKey}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const weekStart = new Date(date);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));
  const clippedStart = new Date(
    Math.max(weekStart.getTime(), monthStart.getTime()),
  );
  const clippedEnd = new Date(Math.min(weekEnd.getTime(), monthEnd.getTime()));
  return `${clippedStart.toISOString().slice(0, 10)}_${clippedEnd.toISOString().slice(0, 10)}`;
}

function formatMonthLabel(key: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    timeZone: "Asia/Manila",
    year: "numeric",
  }).format(new Date(`${key}-01T00:00:00+08:00`));
}

function formatShortMonthLabel(key: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    timeZone: "Asia/Manila",
    year: "2-digit",
  }).format(new Date(`${key}-01T00:00:00+08:00`));
}

function formatShortWeekLabel(key: string) {
  const [startKey, endKey] = key.split("_");
  const startDate = new Date(`${startKey}T00:00:00Z`);
  const endDate = new Date(`${endKey}T00:00:00Z`);
  const startLabel = new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(startDate);
  const endLabel = new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    timeZone: "UTC",
  }).format(endDate);
  return startKey === endKey ? startLabel : `${startLabel}-${endLabel}`;
}

function formatManilaDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatManilaTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatSignedPercentage(value: number) {
  const roundedValue = Math.round(value);
  return `${roundedValue > 0 ? "+" : ""}${roundedValue}%`;
}

function formatCompactPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    compactDisplay: "short",
    currency: "PHP",
    maximumFractionDigits: amount >= 1000 ? 1 : 0,
    notation: "compact",
    style: "currency",
  }).format(amount);
}

function formatRevenuePeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 ? 2 : 0,
    style: "currency",
  }).format(amount);
}
