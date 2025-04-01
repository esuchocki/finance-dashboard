
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface LocationData {
  id: string;
  name: string;
}

interface LocationManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LocationManager: React.FC<LocationManagerProps> = ({ open, onOpenChange }) => {
  const [locations, setLocations] = React.useState<LocationData[]>([]);

  // Load locations from localStorage on component mount
  React.useEffect(() => {
    try {
      const savedData = localStorage.getItem('financial_persona');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.locations && Array.isArray(parsedData.locations)) {
          setLocations(parsedData.locations);
        }
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  }, [open]); // Reload when dialog opens

  const removeLocation = (locationId: string) => {
    try {
      // Get the current data
      const savedData = localStorage.getItem('financial_persona');
      if (!savedData) return;
      
      const parsedData = JSON.parse(savedData);
      
      // If no locations exist, do nothing
      if (!parsedData.locations) return;
      
      // Filter out the location to remove
      const updatedLocations = parsedData.locations.filter(
        (loc: LocationData) => loc.id !== locationId
      );
      
      // Update the data with the new locations array
      parsedData.locations = updatedLocations;
      
      // Save back to localStorage
      localStorage.setItem('financial_persona', JSON.stringify(parsedData));
      
      // Update state to reflect changes
      setLocations(updatedLocations);
      
      toast.success("Location removed successfully");
    } catch (error) {
      console.error("Error removing location:", error);
      toast.error("Failed to remove location");
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Manage Locations
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 my-4">
        {locations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No locations found. Add locations in your background information.
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <Card key={location.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{location.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLocation(location.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </DialogContent>
  );
};

export default LocationManager;
