import { Star } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface SolarDesignerProps {
  name: string;
  email: string;
  bio?: string;
  experience?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  id: string;
}

const SolarDesignerCard = ({ 
  name, 
  email,
  bio = '', 
  experience = '', 
  imageUrl = '', 
  rating = 5, 
  reviewCount = 0,
  id
}: SolarDesignerProps) => {
  return (
    <Card className="max-w-xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden mb-4">
      <CardContent className="p-6">
        <div className="flex items-start space-x-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={imageUrl} alt={name} className="object-cover" />
            <AvatarFallback>{name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-gray-800">{name}</h3>
            <p className="text-purple-600 font-medium">{email}</p>
            <div className="flex items-center mt-2 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < (rating || 5) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
              <span className="ml-2 text-gray-600">({reviewCount} reviews)</span>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {bio && (
            <div>
              <h4 className="font-medium text-gray-800">About Me</h4>
              <p className="text-gray-600 mt-1">{bio}</p>
            </div>
          )}
          {experience && (
            <div>
              <h4 className="font-medium text-gray-800">Experience</h4>
              <p className="text-gray-600 mt-1">{experience}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SolarDesignerCard;
