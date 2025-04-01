
import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, MapPin, School, User, X, Plus, Calendar as CalendarLucideIcon, Trash2, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Define the types for our LocationData
export interface LocationData {
  id: string;
  city: string;
  state: string;
  country: string;
  startDate: Date | null;
  endDate: Date | null;
  isPrimary?: boolean;
}

// Define the types for our BackgroundFormData
export interface BackgroundFormData {
  name: string;
  birthDate: Date;
  occupation: string;
  education: string;
  locations: LocationData[];
}

interface BackgroundFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BackgroundFormData) => void;
  initialData?: BackgroundFormData;
}

export const BackgroundFormDialog: React.FC<BackgroundFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}) => {
  // State for form data
  const [formData, setFormData] = useState<BackgroundFormData>(
    initialData || {
      name: "",
      birthDate: new Date(),
      occupation: "",
      education: "",
      locations: [],
    }
  );

  // State for the new location form
  const [newLocation, setNewLocation] = useState<Omit<LocationData, "id">>({
    city: "",
    state: "",
    country: "",
    startDate: null,
    endDate: null,
    isPrimary: formData.locations.length === 0, // First location is primary by default
  });

  // State to track if we're in location edit mode
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  
  // State for the locations management dialog
  const [locationManagerOpen, setLocationManagerOpen] = useState(false);

  // Helper function to generate a unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 9);
  };

  // Handle input changes for the main form
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof BackgroundFormData
  ) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
  };

  // Handle date change for the birth date
  const handleBirthDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData({
        ...formData,
        birthDate: date,
      });
    }
  };

  // Handle input changes for the new location form
  const handleLocationInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Omit<LocationData, "id">
  ) => {
    setNewLocation({
      ...newLocation,
      [field]: e.target.value,
    });
  };

  // Handle date change for location dates
  const handleLocationDateChange = (
    date: Date | undefined,
    field: "startDate" | "endDate"
  ) => {
    if (date) {
      setNewLocation({
        ...newLocation,
        [field]: date,
      });
    }
  };

  // Add a new location
  const addLocation = () => {
    // Basic validation
    if (!newLocation.city || !newLocation.country) {
      toast.error("Please provide at least a city and country");
      return;
    }

    const newLocationWithId: LocationData = {
      ...newLocation,
      id: generateId(),
    };

    // If this is marked as primary, update other locations
    let updatedLocations = [...formData.locations];
    
    if (newLocation.isPrimary) {
      updatedLocations = updatedLocations.map(loc => ({
        ...loc,
        isPrimary: false
      }));
    }

    // Add the new location
    updatedLocations.push(newLocationWithId);

    // Update the form data
    setFormData({
      ...formData,
      locations: updatedLocations,
    });

    // Reset the new location form
    setNewLocation({
      city: "",
      state: "",
      country: "",
      startDate: null,
      endDate: null,
      isPrimary: false,
    });

    // Close the location form
    setIsAddingLocation(false);
    
    toast.success("Location added successfully");
  };

  // Set a location as primary
  const setPrimaryLocation = (id: string) => {
    const updatedLocations = formData.locations.map(loc => ({
      ...loc,
      isPrimary: loc.id === id
    }));

    setFormData({
      ...formData,
      locations: updatedLocations,
    });
    
    toast.success("Primary location updated");
  };

  // Remove a location
  const removeLocation = (id: string) => {
    // Find if we're removing the primary location
    const removingPrimary = formData.locations.find(loc => loc.id === id)?.isPrimary;
    
    // Filter out the location to remove
    let updatedLocations = formData.locations.filter(loc => loc.id !== id);
    
    // If we removed the primary and we have other locations, set the first one as primary
    if (removingPrimary && updatedLocations.length > 0) {
      updatedLocations = updatedLocations.map((loc, index) => ({
        ...loc,
        isPrimary: index === 0
      }));
    }
    
    setFormData({
      ...formData,
      locations: updatedLocations,
    });
    
    toast.success("Location removed");
  };

  // Handle form submission
  const handleSubmit = () => {
    // Basic validation
    if (!formData.name) {
      toast.error("Please provide your name");
      return;
    }

    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Background
          </DialogTitle>
          <DialogDescription>
            This information helps us provide more personalized financial insights.
            All data stays on your device and is never sent to a server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange(e, "name")}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthdate">Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.birthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.birthDate ? (
                        format(formData.birthDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.birthDate}
                      onSelect={handleBirthDateChange}
                      initialFocus
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange(e, "occupation")}
                  placeholder="Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={formData.education}
                  onChange={(e) => handleInputChange(e, "education")}
                  placeholder="Bachelor's in Computer Science"
                />
              </div>
            </div>
          </div>

          {/* Locations Section */}
          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue="locations"
          >
            <AccordionItem value="locations">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Locations</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Add places you've lived to help contextualize spending
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => setIsAddingLocation(!isAddingLocation)}
                    >
                      {isAddingLocation ? (
                        <>
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>Add Location</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* New Location Form */}
                  {isAddingLocation && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              value={newLocation.city}
                              onChange={(e) =>
                                handleLocationInputChange(e, "city")
                              }
                              placeholder="San Francisco"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="state">State/Province</Label>
                            <Input
                              id="state"
                              value={newLocation.state}
                              onChange={(e) =>
                                handleLocationInputChange(e, "state")
                              }
                              placeholder="California"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input
                              id="country"
                              value={newLocation.country}
                              onChange={(e) =>
                                handleLocationInputChange(e, "country")
                              }
                              placeholder="United States"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Duration</Label>
                            <div className="flex items-center gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !newLocation.startDate &&
                                        "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarLucideIcon className="mr-2 h-4 w-4" />
                                    {newLocation.startDate ? (
                                      format(newLocation.startDate, "MMM yyyy")
                                    ) : (
                                      <span>Start Date</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={
                                      newLocation.startDate || undefined
                                    }
                                    onSelect={(date) =>
                                      handleLocationDateChange(
                                        date,
                                        "startDate"
                                      )
                                    }
                                    initialFocus
                                    disabled={(date) => date > new Date()}
                                  />
                                </PopoverContent>
                              </Popover>

                              <span>to</span>

                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !newLocation.endDate &&
                                        "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarLucideIcon className="mr-2 h-4 w-4" />
                                    {newLocation.endDate ? (
                                      format(newLocation.endDate, "MMM yyyy")
                                    ) : (
                                      <span>End Date</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={newLocation.endDate || undefined}
                                    onSelect={(date) =>
                                      handleLocationDateChange(date, "endDate")
                                    }
                                    initialFocus
                                    disabled={(date) =>
                                      date >
                                        new Date() ||
                                      (newLocation.startDate !== null &&
                                        date < newLocation.startDate)
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center mt-4">
                          <input
                            type="checkbox"
                            id="isPrimary"
                            className="mr-2"
                            checked={newLocation.isPrimary}
                            onChange={(e) =>
                              setNewLocation({
                                ...newLocation,
                                isPrimary: e.target.checked,
                              })
                            }
                          />
                          <Label htmlFor="isPrimary">
                            This is my primary residence
                          </Label>
                        </div>

                        <div className="flex justify-end mt-4">
                          <Button onClick={addLocation}>Add Location</Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Location List */}
                  {formData.locations.length > 0 ? (
                    <div className="grid gap-4">
                      {formData.locations.map((location) => (
                        <Card
                          key={location.id}
                          className={cn(
                            "relative",
                            location.isPrimary
                              ? "border-green-500"
                              : "border-border"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-wrap justify-between items-start gap-2">
                              <div>
                                <h4 className="font-medium flex items-center gap-1">
                                  {location.city}, {location.state && `${location.state}, `}
                                  {location.country}
                                  {location.isPrimary && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                      Primary
                                    </span>
                                  )}
                                </h4>
                                {location.startDate && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {format(location.startDate, "MMM yyyy")} -{" "}
                                    {location.endDate
                                      ? format(location.endDate, "MMM yyyy")
                                      : "Present"}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {!location.isPrimary && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8"
                                    onClick={() =>
                                      setPrimaryLocation(location.id)
                                    }
                                  >
                                    Set as Primary
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => removeLocation(location.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Remove</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed rounded-md">
                      <MapPinOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No locations added</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setIsAddingLocation(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Your First Location
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Information</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
