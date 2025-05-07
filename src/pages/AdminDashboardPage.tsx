import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Info,
  Key,
  Lock,
  MapPin,
  Tags,
  Trash2,
  Settings,
  LogOut,
} from 'lucide-react';
import { format } from 'date-fns';
import EditablePercentage from '@/components/EditablePercentage';
import EditSalesRepDetails from '@/components/EditSalesRepDetails';
import RoutingStatsGraph from '@/components/RoutingStatsGraph';

type SalesRep = {
  id: string;
  name: string;
  email: string;
  percentage?: number;
  bio?: string;
  experience?: string;
  image_url?: string;
  rating?: number;
  review_count?: number;
};

type CityRule = {
  id: string;
  city: string;
  sales_rep_id: string;
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [cityRules, setCityRules] = useState<CityRule[]>([]);
  const [routingLogs, setRoutingLogs] = useState<any[]>([]);
  const [sourceRules, setSourceRules] = useState<any[]>([]);
  
  // Form states
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPercentage, setNewPercentage] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newExperience, setNewExperience] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newCity, setNewCity] = useState("");
  const [selectedSalesRepId, setSelectedSalesRepId] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("");
  const [newLeadStatus, setNewLeadStatus] = useState("");
  const [selectedSourceRepId, setSelectedSourceRepId] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Get the stored admin user from localStorage
      const adminUser = localStorage.getItem('adminUser');
      if (!adminUser) {
        navigate('/admin/login');
        return;
      }

      const user = JSON.parse(adminUser);
      
      // Verify the user still exists and is an admin
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !member) {
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
        return;
      }

      setIsAuthenticated(true);
      loadSalesReps();
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/admin/login');
    }
  };

  const loadSalesReps = async () => {
    try {
      const { data: reps, error: repsError } = await supabase
        .from("sales_reps")
        .select("*");

      if (repsError) throw repsError;

      const { data: rules, error: rulesError } = await supabase
        .from("routing_rules")
        .select("*")
        .eq("is_active", true);

      if (rulesError) throw rulesError;

      const { data: cityRulesData, error: cityRulesError } = await supabase
        .from("city_routing_rules")
        .select("*")
        .eq("is_active", true);

      if (cityRulesError) throw cityRulesError;

      const repsWithPercentages = reps.map((rep: SalesRep) => ({
        ...rep,
        percentage: rules.find((rule: any) => rule.sales_rep_id === rep.id)?.percentage || 0,
      }));

      setSalesReps(repsWithPercentages);
      setCityRules(cityRulesData || []);
      await loadRoutingLogs();
      await loadSourceRules();
    } catch (error) {
      toast.error("Failed to load sales representatives");
    }
  };

  const loadRoutingLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('routing_logs')
        .select(`
          *,
          sales_rep:assigned_sales_rep_id (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRoutingLogs(data || []);
    } catch (error) {
      toast.error('Failed to load routing logs');
    }
  };

  const loadSourceRules = async () => {
    try {
      const { data, error } = await supabase
        .from('city_routing_rules')
        .select(`
          *,
          sales_rep:sales_rep_id (name, email)
        `)
        .is('city', null)
        .eq('is_active', true);

      if (error) throw error;
      setSourceRules(data || []);
    } catch (error) {
      toast.error('Failed to load source routing rules');
    }
  };

  const addSalesRep = async () => {
    if (!newName || !newEmail || !newPercentage) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data: repData, error: repError } = await supabase
        .from("sales_reps")
        .insert([{ 
          name: newName, 
          email: newEmail,
          bio: newBio,
          experience: newExperience,
          image_url: newImageUrl
        }])
        .select()
        .single();

      if (repError) throw repError;

      const { error: ruleError } = await supabase
        .from("routing_rules")
        .insert([{
          sales_rep_id: repData.id,
          percentage: parseInt(newPercentage),
          is_active: true
        }]);

      if (ruleError) throw ruleError;

      setNewName("");
      setNewEmail("");
      setNewPercentage("");
      setNewBio("");
      setNewExperience("");
      setNewImageUrl("");
      loadSalesReps();

      toast.success("Sales representative added successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const removeSalesRep = async (id: string) => {
    try {
      const { error: ruleError } = await supabase
        .from("routing_rules")
        .delete()
        .eq("sales_rep_id", id);

      if (ruleError) throw ruleError;

      const { error: cityRuleError } = await supabase
        .from("city_routing_rules")
        .delete()
        .eq("sales_rep_id", id);

      if (cityRuleError) throw cityRuleError;

      const { error: repError } = await supabase
        .from("sales_reps")
        .delete()
        .eq("id", id);

      if (repError) throw repError;

      toast.success("Sales representative removed successfully");
      loadSalesReps();
    } catch (error) {
      toast.error("Failed to remove sales representative");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-gray-500 mr-2" />
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Routing Settings</CardTitle>
            </div>
            <CardDescription>
              Configure sales representatives routing rules and monitor lead assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="percentage" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 gap-4">
                <TabsTrigger value="percentage">Percentage-based</TabsTrigger>
                <TabsTrigger value="city">City-based</TabsTrigger>
                <TabsTrigger value="source">Source-based</TabsTrigger>
                <TabsTrigger value="logs">Routing Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="percentage" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Sales Representative</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Name *"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                      <Input
                        placeholder="Email *"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Percentage (0-100) *"
                      type="number"
                      min="0"
                      max="100"
                      value={newPercentage}
                      onChange={(e) => setNewPercentage(e.target.value)}
                    />
                    <Input
                      placeholder="Image URL"
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <textarea
                        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Bio"
                        value={newBio}
                        onChange={(e) => setNewBio(e.target.value)}
                      />
                      <textarea
                        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Experience"
                        value={newExperience}
                        onChange={(e) => setNewExperience(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={addSalesRep}>Add Sales Representative</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Current Sales Representatives</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesReps.map((rep) => (
                          <TableRow key={rep.id}>
                            <TableCell>{rep.name}</TableCell>
                            <TableCell>{rep.email}</TableCell>
                            <TableCell className="text-right">
                              <EditablePercentage 
                                value={rep.percentage || 0} 
                                repId={rep.id} 
                                onUpdate={loadSalesReps}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <EditSalesRepDetails
                                  repId={rep.id}
                                  imageUrl={rep.image_url}
                                  bio={rep.bio}
                                  experience={rep.experience}
                                  rating={rep.rating}
                                  reviewCount={rep.review_count}
                                  onUpdate={loadSalesReps}
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeSalesRep(rep.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="city" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New City Rule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="City name"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                      />
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedSalesRepId}
                        onChange={(e) => setSelectedSalesRepId(e.target.value)}
                      >
                        <option value="">Select Sales Rep</option>
                        {salesReps.map((rep) => (
                          <option key={rep.id} value={rep.id}>
                            {rep.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button className="w-full">
                      <MapPin className="h-4 w-4 mr-2" />
                      Add City Rule
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Current City Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>City</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cityRules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell className="capitalize">{rule.city}</TableCell>
                            <TableCell>
                              {salesReps.find(rep => rep.id === rule.sales_rep_id)?.name}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="source" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Source Rule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Lead Source"
                        value={newLeadSource}
                        onChange={(e) => setNewLeadSource(e.target.value)}
                      />
                      <Input
                        placeholder="Lead Status (optional)"
                        value={newLeadStatus}
                        onChange={(e) => setNewLeadStatus(e.target.value)}
                      />
                    </div>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedSourceRepId}
                      onChange={(e) => setSelectedSourceRepId(e.target.value)}
                    >
                      <option value="">Select Sales Rep</option>
                      {salesReps.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name}
                        </option>
                      ))}
                    </select>
                    <Button className="w-full">
                      <Tags className="h-4 w-4 mr-2" />
                      Add Source Rule
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Current Source Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead Source</TableHead>
                          <TableHead>Lead Status</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sourceRules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell className="capitalize">{rule.lead_source}</TableCell>
                            <TableCell>{rule.status || 'N/A'}</TableCell>
                            <TableCell>
                              {rule.sales_rep ? 
                                `${rule.sales_rep.name} (${rule.sales_rep.email})` : 
                                'N/A'
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Routing Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RoutingStatsGraph />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Routing Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Assigned To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routingLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboardPage; 