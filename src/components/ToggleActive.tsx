import React, { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToggleActiveProps {
  repId: string;
  isActive: boolean;
  onUpdate: () => void;
}

const ToggleActive = ({ repId, isActive, onUpdate }: ToggleActiveProps) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("sales_reps")
        .update({ is_active: checked })
        .eq("id", repId);

      if (error) throw error;
      
      // Success message using appropriate verb based on state change
      toast.success(`Sales rep ${checked ? 'activated' : 'deactivated'} successfully`);
      
      // Refresh data
      onUpdate();
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch 
        id={`active-toggle-${repId}`}
        checked={isActive} 
        onCheckedChange={handleToggle}
        disabled={loading}
        aria-label={`Toggle active status for sales rep`}
      />
      <Label 
        htmlFor={`active-toggle-${repId}`}
        className={`text-sm ${loading ? 'text-gray-400' : isActive ? 'text-green-600' : 'text-red-600'}`}
      >
        {loading ? 'Updating...' : isActive ? 'Active' : 'Inactive'}
      </Label>
    </div>
  );
};

export default ToggleActive; 