import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

type EditSalesRepDetailsProps = {
  repId: string;
  imageUrl?: string;
  bio?: string;
  experience?: string;
  rating?: number;
  reviewCount?: number;
  onUpdate: () => void;
};

const EditSalesRepDetails = ({ 
  repId, 
  imageUrl, 
  bio, 
  experience, 
  rating = 5, 
  reviewCount = 0,
  onUpdate 
}: EditSalesRepDetailsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState(imageUrl || '');
  const [newBio, setNewBio] = useState(bio || '');
  const [newExperience, setNewExperience] = useState(experience || '');
  const [newRating, setNewRating] = useState(rating);
  const [newReviewCount, setNewReviewCount] = useState(reviewCount);

  const handleUpdate = async () => {
    try {
      const { error } = await supabase
        .from("sales_reps")
        .update({
          image_url: newImageUrl,
          bio: newBio,
          experience: newExperience,
          rating: newRating,
          review_count: newReviewCount
        })
        .eq("id", repId);

      if (error) throw error;

      toast.success("Details updated successfully");
      onUpdate();
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">
          ({reviewCount} reviews)
        </span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-start gap-2">
          {renderStars(rating)}
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Sales Representative Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <Input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={newRating}
              onChange={(e) => setNewRating(parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Review Count</label>
            <Input
              type="number"
              min="0"
              value={newReviewCount}
              onChange={(e) => setNewReviewCount(parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Image URL</label>
            <Input
              placeholder="Image URL"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Bio"
              value={newBio}
              onChange={(e) => setNewBio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Experience</label>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Experience"
              value={newExperience}
              onChange={(e) => setNewExperience(e.target.value)}
            />
          </div>
          <Button onClick={handleUpdate}>Update Details</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditSalesRepDetails; 