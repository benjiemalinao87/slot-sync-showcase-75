import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format, subHours, subDays, subMonths } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DateRange = '24h' | '7D' | '1M' | '3M' | '6M';

// Updated color schemes
const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28'];
const BAR_COLORS = [
  '#FF6B6B', // coral red
  '#4ECDC4', // turquoise
  '#45B7D1', // sky blue
  '#96CEB4', // sage green
  '#FFEEAD', // cream yellow
  '#D4A5A5', // dusty rose
  '#9FA8DA', // periwinkle
  '#FFE0B2', // peach
  '#A5D6A7', // mint green
  '#E1BEE7', // light purple
];

const RoutingStatsGraph = () => {
  const [routingMethodData, setRoutingMethodData] = useState<any[]>([]);
  const [salesRepData, setSalesRepData] = useState<any[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange>('24h');
  const [loading, setLoading] = useState(true);

  const getStartDate = (range: DateRange) => {
    const now = new Date();
    switch (range) {
      case '24h':
        return subHours(now, 24);
      case '7D':
        return subDays(now, 7);
      case '1M':
        return subMonths(now, 1);
      case '3M':
        return subMonths(now, 3);
      case '6M':
        return subMonths(now, 6);
      default:
        return subHours(now, 24);
    }
  };

  const loadRoutingStats = async () => {
    try {
      setLoading(true);
      const startDate = getStartDate(selectedRange);

      const { data: logs, error } = await supabase
        .from('routing_logs')
        .select(`
          routing_method,
          assigned_sales_rep_id,
          sales_rep:assigned_sales_rep_id (name)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data for pie chart
      const methodCounts = logs.reduce((acc: any, log: any) => {
        acc[log.routing_method] = (acc[log.routing_method] || 0) + 1;
        return acc;
      }, {});

      const pieData = Object.entries(methodCounts).map(([name, value]) => ({
        name,
        value
      }));

      setRoutingMethodData(pieData);

      // Process data for bar chart
      const percentageBasedLogs = logs.filter((log: any) => log.routing_method === 'percentage');
      const repCounts = percentageBasedLogs.reduce((acc: any, log: any) => {
        const repName = log.sales_rep?.name || 'Unknown';
        acc[repName] = (acc[repName] || 0) + 1;
        return acc;
      }, {});

      // Sort data by count in descending order
      const barData = Object.entries(repCounts)
        .map(([name, count]) => ({
          name,
          count: count as number,
        }))
        .sort((a, b) => (b.count as number) - (a.count as number));

      setSalesRepData(barData);
    } catch (error) {
      console.error('Error loading routing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutingStats();
  }, [selectedRange]);

  const dateRanges: { label: string; value: DateRange }[] = [
    { label: '24h', value: '24h' },
    { label: '7D', value: '7D' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">
            Leads Assigned: <span className="font-medium">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div>Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 justify-end">
        {dateRanges.map((range) => (
          <Button
            key={range.value}
            variant={selectedRange === range.value ? "default" : "outline"}
            onClick={() => setSelectedRange(range.value)}
            size="sm"
          >
            {range.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Routing Methods Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={routingMethodData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {routingMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Percentage-based Routing by Sales Rep</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesRepData}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Leads Assigned"
                  >
                    {salesRepData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoutingStatsGraph; 