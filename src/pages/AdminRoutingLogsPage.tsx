import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader } from 'lucide-react';
import RoutingStatsGraph from '@/components/RoutingStatsGraph';

type RoutingLog = {
  id: string;
  lead_email: string | null;
  lead_city: string | null;
  lead_source: string | null;
  lead_status: string | null;
  assigned_sales_rep_id: string;
  routing_method: string;
  routing_criteria: any;
  random_value: number | null;
  created_at: string;
  sales_rep?: {
    name: string;
    email: string;
  };
};

const AdminRoutingLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<RoutingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  const fetchRoutingLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('routing_logs')
        .select(`
          *,
          sales_rep:assigned_sales_rep_id (name, email)
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      if (data.length < pageSize) {
        setHasMore(false);
      }

      setLogs(prevLogs => 
        page === 1 ? data : [...prevLogs, ...data]
      );
    } catch (error) {
      console.error('Error fetching routing logs:', error);
      toast.error('Failed to fetch routing logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutingLogs();
  }, [page]);

  const renderRoutingCriteria = (log: RoutingLog) => {
    if (!log.routing_criteria) return 'N/A';
    
    // Format different routing methods
    switch (log.routing_method) {
      case 'source':
        return JSON.stringify({
          leadSource: log.lead_source,
          leadStatus: log.lead_status
        });
      case 'city':
        return log.lead_city || 'N/A';
      case 'percentage':
        return `Random Value: ${log.random_value?.toFixed(2) || 'N/A'}`;
      default:
        return JSON.stringify(log.routing_criteria);
    }
  };

  const loadMore = () => {
    setPage(prevPage => prevPage + 1);
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <RoutingStatsGraph />
      
      <Card>
        <CardHeader>
          <CardTitle>Routing Logs</CardTitle>
          <CardDescription>
            Detailed history of lead routing and assigned sales representatives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Routing Method</TableHead>
                <TableHead>Assigned Rep</TableHead>
                <TableHead>Routing Criteria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell>{log.lead_email || 'N/A'}</TableCell>
                  <TableCell>{log.lead_city || 'N/A'}</TableCell>
                  <TableCell>{log.routing_method}</TableCell>
                  <TableCell>
                    {log.sales_rep ? 
                      `${log.sales_rep.name} (${log.sales_rep.email})` : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell>{renderRoutingCriteria(log)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button 
                onClick={loadMore} 
                disabled={isLoading}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRoutingLogsPage;
