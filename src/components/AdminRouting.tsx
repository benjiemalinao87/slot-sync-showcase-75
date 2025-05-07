import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Settings, Trash2, MapPin, Tags, Info, Key, Lock, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import EditablePercentage from './EditablePercentage';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ToggleActive from './ToggleActive';

type SalesRep = {
  id: string;
  name: string;
  email: string;
  percentage?: number;
  bio?: string;
  experience?: string;
  image_url?: string;
  is_active?: boolean;
};

type CityRule = {
  id: string;
  city: string;
  sales_rep_id: string;
  is_active: boolean;
};

const AdminRouting = () => {
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [cityRules, setCityRules] = useState<CityRule[]>([]);
  const [routingLogs, setRoutingLogs] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPercentage, setNewPercentage] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newExperience, setNewExperience] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newCity, setNewCity] = useState("");
  const [selectedSalesRepId, setSelectedSalesRepId] = useState("");
  const [sourceRules, setSourceRules] = useState<any[]>([]);
  const [newLeadSource, setNewLeadSource] = useState("");
  const [newLeadStatus, setNewLeadStatus] = useState("");
  const [selectedSourceRepId, setSelectedSourceRepId] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

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

  const handleGearClick = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
    } else {
      loadSalesReps();
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter both email and password");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    try {
      // Default admin credentials as fallback
      const defaultAdminEmail = "admin@example.com";
      const defaultAdminPassword = "admin123";
      
      // Check if using default admin credentials
      if (loginEmail === defaultAdminEmail && loginPassword === defaultAdminPassword) {
        setIsAuthenticated(true);
        setShowLoginDialog(false);
        loadSalesReps();
        toast.success("Welcome, Administrator");
        return;
      }

      // Query the members table to validate credentials
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("email", loginEmail.toLowerCase())
        .single();

      if (error) {
        console.error("Database error:", error);
        
        // If there's a database error, show a more user-friendly message
        if (error.code === "PGRST116") {
          setLoginError("Database error: Row-level security policy violation");
        } else if (error.code?.includes("500")) {
          setLoginError("Server error. Please try again or use default admin credentials.");
        } else {
          setLoginError(`Error: ${error.message || "Unknown error"}`);
        }
        
        setIsLoggingIn(false);
        return;
      }
      
      if (!data) {
        setLoginError("Invalid credentials");
        setIsLoggingIn(false);
        return;
      }
      
      // Very basic password check
      // In production, use proper password hashing
      if (data.password === loginPassword) {
        setIsAuthenticated(true);
        setShowLoginDialog(false);
        loadSalesReps();
        toast.success(`Welcome, ${data.name || 'Admin'}`);
      } else {
        setLoginError("Invalid credentials");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Login failed. Try default admin credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    toast.info("Logged out successfully");
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

  const addCityRule = async () => {
    if (!newCity || !selectedSalesRepId) {
      toast.error("Please select a city and sales representative");
      return;
    }

    try {
      await supabase
        .from("city_routing_rules")
        .update({ is_active: false })
        .eq("city", newCity.toLowerCase());

      const { error } = await supabase
        .from("city_routing_rules")
        .insert([{
          city: newCity.toLowerCase(),
          sales_rep_id: selectedSalesRepId,
          is_active: true
        }]);

      if (error) throw error;

      setNewCity("");
      setSelectedSalesRepId("");
      loadSalesReps();
      toast.success("City routing rule added successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const addSourceRule = async () => {
    if (!newLeadSource || !selectedSourceRepId) {
      toast.error("Please select a lead source and sales representative");
      return;
    }

    try {
      // First deactivate any existing rules for this source
      await supabase
        .from("city_routing_rules")
        .update({ is_active: false })
        .is('city', null)
        .eq('lead_source', newLeadSource.toLowerCase());

      // Create the new rule with consistent field names
      const ruleData = {
        city: null,
        lead_source: newLeadSource.toLowerCase(),
        lead_status: newLeadStatus || null,
        status: newLeadStatus || null, // Also set status field for backward compatibility
        sales_rep_id: selectedSourceRepId,
        is_active: true
      };

      console.log('Creating source rule with data:', ruleData);

      const { data, error } = await supabase
        .from("city_routing_rules")
        .insert([ruleData])
        .select();

      if (error) throw error;
      
      console.log('Source rule created successfully:', data);

      setNewLeadSource("");
      setNewLeadStatus("");
      setSelectedSourceRepId("");
      loadSalesReps();
      toast.success("Source routing rule added successfully");
    } catch (error: any) {
      console.error('Error creating source rule:', error);
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

  const removeCityRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("city_routing_rules")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("City rule removed successfully");
      loadSalesReps();
    } catch (error) {
      toast.error("Failed to remove city rule");
    }
  };

  const removeSourceRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("city_routing_rules")
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success("Source rule removed successfully");
      loadSalesReps();
    } catch (error) {
      toast.error("Failed to remove source rule");
    }
  };

  const checkGoogleCalendarConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'checkConfiguration' }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.isConfigured) {
        toast.success("Google Calendar is configured");
      } else {
        toast.error("Google Calendar is not configured. Please set up your credentials.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to check configuration");
    }
  };

  return (
    <>
      {/* Admin Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lock className="mr-2 h-4 w-4" />
              Admin Authentication Required
            </DialogTitle>
            <DialogDescription>
              Please enter your admin credentials to access settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Input
                id="email"
                placeholder="Email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                placeholder="Password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            
            {loginError && (
              <div className="text-sm font-medium text-red-500">
                {loginError}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex space-x-2 sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleLogin} disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Login
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Admin Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <div className="fixed bottom-2 right-2 z-50">
            <button 
              className="h-6 w-6 bg-transparent border-0 rounded-none outline-none p-0 text-gray-200/20 hover:text-gray-300/30 transition-opacity duration-300"
              onClick={handleGearClick}
              aria-label="Admin settings"
            >
              <Settings className="h-2.5 w-2.5" />
            </button>
          </div>
        </DialogTrigger>
        {isAuthenticated && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DialogTitle>Routing Settings</DialogTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[350px] p-4">
                      <div className="space-y-2 text-sm">
                        <h4 className="font-semibold">Routing Order of Operations:</h4>
                        <div className="pl-2 border-l-2">
                          1. Source-based Routing
                          <div className="pl-3 text-muted-foreground">
                            ├── Check Lead Source
                            <br />
                            └── Check Lead Status
                          </div>
                        </div>
                        <div className="pl-2 border-l-2">
                          2. City-based Routing
                          <div className="pl-3 text-muted-foreground">
                            └── Match lead city with rules
                          </div>
                        </div>
                        <div className="pl-2 border-l-2">
                          3. Percentage-based Routing
                          <div className="pl-3 text-muted-foreground">
                            └── Fallback using rep percentages
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <Lock className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
              <DialogDescription>
                Configure sales representatives routing rules.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="percentage" className="mt-6">
              <TabsList>
                <TabsTrigger value="percentage">Percentage-based Routing</TabsTrigger>
                <TabsTrigger value="city">City-based Routing</TabsTrigger>
                <TabsTrigger value="source">Source-based Routing</TabsTrigger>
                <TabsTrigger value="logs">Routing Logs</TabsTrigger>
                <TabsTrigger value="calendar">Calendar Config</TabsTrigger>
              </TabsList>

              <TabsContent value="percentage" className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Add New Sales Representative</h4>
                  <div className="grid gap-4">
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
                    <Textarea
                      placeholder="Bio"
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                      rows={3}
                    />
                    <Textarea
                      placeholder="Experience"
                      value={newExperience}
                      onChange={(e) => setNewExperience(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={addSalesRep} className="w-full">Add Sales Rep</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Current Sales Representatives</h4>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesReps.map((rep) => (
                          <TableRow 
                            key={rep.id}
                            className={rep.is_active === false ? 'opacity-50' : ''}
                          >
                            <TableCell>{rep.name}</TableCell>
                            <TableCell className="truncate">{rep.email}</TableCell>
                            <TableCell>
                              <ToggleActive 
                                repId={rep.id} 
                                isActive={rep.is_active !== false} 
                                onUpdate={loadSalesReps}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <EditablePercentage 
                                value={rep.percentage || 0} 
                                repId={rep.id} 
                                onUpdate={loadSalesReps}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeSalesRep(rep.id)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="city" className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Add New City Rule</h4>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="City name"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                      />
                      <select
                        className="border rounded-md p-2"
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
                    <Button onClick={addCityRule} className="w-full">
                      <MapPin className="mr-2 h-4 w-4" />
                      Add City Rule
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Current City Rules</h4>
                  <div className="border rounded-md">
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
                                onClick={() => removeCityRule(rule.id)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="source" className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Add New Source Routing Rule</h4>
                  <div className="grid gap-4">
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
                      className="border rounded-md p-2"
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
                    <Button onClick={addSourceRule} className="w-full">
                      <Tags className="mr-2 h-4 w-4" />
                      Add Source Rule
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Current Source Routing Rules</h4>
                  <div className="border rounded-md">
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
                                onClick={() => removeSourceRule(rule.id)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="logs" className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Routing Logs</h4>
                  <div className="border rounded-md">
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
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="calendar" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Google Calendar Configuration</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={checkGoogleCalendarConfig}
                    >
                      Check Configuration
                    </Button>
                  </div>
                  
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertTitle>Refresh Token Status</AlertTitle>
                    <AlertDescription>
                      The refresh token is required for Google Calendar integration to work properly. 
                      Please use the Google Calendar Auth flow to obtain a new refresh token.
                    </AlertDescription>
                  </Alert>

                  <div className="mt-4">
                    <Button 
                      className="w-full"
                      variant="default"
                      onClick={() => window.location.href = '/admin/google-auth'}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Start Google Calendar Auth Flow
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};

export default AdminRouting;
