import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pencil } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

type EditRoutingRuleProps = {
  ruleId: string;
  ruleType: 'city' | 'source';
  currentValues: {
    city?: string;
    lead_source?: string;
    status: string | null;
    sales_rep_id: string;
  };
  salesReps: Array<{
    id: string;
    name: string;
  }>;
  onUpdate: () => void;
};

const EditRoutingRule = ({ ruleId, ruleType, currentValues, salesReps, onUpdate }: EditRoutingRuleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [primaryValue, setPrimaryValue] = useState(ruleType === 'city' ? currentValues.city : currentValues.lead_source);
  const [status, setStatus] = useState(currentValues.status || '');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState(currentValues.sales_rep_id);

  const handleSave = async () => {
    try {
      const updateData = {
        ...(ruleType === 'city' ? { city: primaryValue?.toLowerCase() } : { lead_source: primaryValue?.toLowerCase() }),
        status: status || null,
        sales_rep_id: selectedSalesRepId,
      };

      const { error } = await supabase
        .from("city_routing_rules")
        .update(updateData)
        .eq('id', ruleId);

      if (error) throw error;

      toast.success(`${ruleType === 'city' ? 'City' : 'Source'} rule updated successfully`);
      setIsOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || `Failed to update ${ruleType} rule`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {ruleType === 'city' ? 'City' : 'Source'} Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder={ruleType === 'city' ? "City name" : "Lead source"}
              value={primaryValue}
              onChange={(e) => setPrimaryValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Lead Status (optional)"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
          <div className="space-y-2">
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
          <Button className="w-full" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditRoutingRule; 