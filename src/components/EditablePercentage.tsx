import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EditablePercentageProps {
  value: number;
  repId: string;
  onUpdate: () => void;
}

const EditablePercentage = ({ value, repId, onUpdate }: EditablePercentageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [percentage, setPercentage] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    // Validate percentage is between 0 and 100
    if (percentage < 0 || percentage > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }

    try {
      // Get all current routing rules to calculate total percentage
      const { data: rules, error: rulesError } = await supabase
        .from('routing_rules')
        .select('sales_rep_id, percentage')
        .eq('is_active', true);

      if (rulesError) throw rulesError;

      // Calculate total percentage excluding current rep
      const totalOtherPercentage = rules
        .filter(rule => rule.sales_rep_id !== repId)
        .reduce((sum, rule) => sum + (rule.percentage || 0), 0);

      // Check if new total would exceed 100%
      if (totalOtherPercentage + percentage > 100) {
        toast.error("Total percentage across all sales reps cannot exceed 100%");
        return;
      }

      // Update the percentage if validation passes
      const { error } = await supabase
        .from('routing_rules')
        .update({ percentage })
        .eq('sales_rep_id', repId);

      if (error) throw error;

      setIsEditing(false);
      onUpdate();
      toast.success('Percentage updated successfully');
    } catch (error) {
      console.error('Error updating percentage:', error);
      toast.error('Failed to update percentage');
    }
  };

  const handleCancel = () => {
    setPercentage(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="number"
          min="0"
          max="100"
          value={percentage}
          onChange={(e) => setPercentage(Number(e.target.value))}
          className="w-20 h-8"
        />
        <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
          <Check className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span>{value}%</span>
      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8">
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default EditablePercentage;
