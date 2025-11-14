import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp } from "lucide-react";
import { ReferralEarning } from "@/services/customerReferralService";
import { format, startOfMonth, parseISO } from "date-fns";

interface ReferralEarningsChartProps {
  history: ReferralEarning[] | undefined;
}

interface MonthlyData {
  month: string;
  total: number;
  approved: number;
  pending: number;
}

export function ReferralEarningsChart({ history }: ReferralEarningsChartProps) {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Group earnings by month
    const monthlyMap = new Map<string, MonthlyData>();

    history.forEach((earning) => {
      const date = parseISO(earning.created_at);
      const monthKey = format(startOfMonth(date), "yyyy-MM");
      const monthLabel = format(startOfMonth(date), "MMM yy");

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthLabel,
          total: 0,
          approved: 0,
          pending: 0,
        });
      }

      const data = monthlyMap.get(monthKey)!;
      data.total += earning.amount;

      if (earning.status === "approved" || earning.status === "paid") {
        data.approved += earning.amount;
      } else {
        data.pending += earning.amount;
      }
    });

    // Convert to array and sort by month
    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => data);
  }, [history]);

  const chartConfig = {
    total: {
      label: "Total Earnings",
      color: "hsl(var(--chart-1))",
    },
    approved: {
      label: "Approved",
      color: "hsl(var(--chart-2))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--chart-3))",
    },
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4" />
            Earnings Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            No earnings data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-4 h-4" />
          Earnings Trend
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Monthly referral earnings breakdown
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-total)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-total)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillApproved" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-approved)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-approved)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `₹${value}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `${value}`}
                  formatter={(value, name) => [
                    `₹${Number(value).toFixed(2)}`,
                    chartConfig[name as keyof typeof chartConfig]?.label || name,
                  ]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="approved"
              stroke="var(--color-approved)"
              fill="url(#fillApproved)"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              fill="url(#fillTotal)"
              fillOpacity={0.4}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
