
import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, MapPin, School, User, X, Plus, Calendar as CalendarLucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDateInputString, parseDateInput } from "@/lib/formatters";

export interface Location {
  id: string;
  place: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface BackgroundFormData {
  name: string;
  birthDate: Date | null;
  locations: Location[];
  education: {
    level: string;
    school: string;
    major: string;
    graduationDate: Date | null;
  };
}

interface BackgroundFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BackgroundFormData) => void;
  initialData?: BackgroundFormData;
}

const defaultFormData: BackgroundFormData = {
  name: "",
  birthDate: null,
  locations: [
    {
      id: "loc-" + Math.random().toString(36).substring(2, 9),
      place: "",
      startDate: null,
      endDate: null,
    },
  ],
  education: {
    level: "",
    school: "",
    major: "",
    graduationDate: null,
  },
};

const educationLevels = [
  "High School",
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
  "Professional Degree",
  "Other",
];

export function BackgroundFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: BackgroundFormDialogProps) {
  const [formData, setFormData] = useState<BackgroundFormData>(
    initialData || defaultFormData
  );
  
  // Date input states
  const [birthDateInput, setBirthDateInput] = useState<string>(
    formData.birthDate ? format(formData.birthDate, "MM/dd/yyyy") : ""
  );
  const [locationDateInputs, setLocationDateInputs] = useState<{[key: string]: {start: string, end: string}}>({
    ...formData.locations.reduce((acc, loc) => ({
      ...acc,
      [loc.id]: {
        start: loc.startDate ? format(loc.startDate, "MM/dd/yyyy") : "",
        end: loc.endDate ? format(loc.endDate, "MM/dd/yyyy") : ""
      }
    }), {})
  });
  const [graduationDateInput, setGraduationDateInput] = useState<string>(
    formData.education.graduationDate ? format(formData.education.graduationDate, "MM/dd/yyyy") : ""
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name.startsWith("education.")) {
      const field = name.split(".")[1];
      setFormData({
        ...formData,
        education: {
          ...formData.education,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Birth date handling
  const handleBirthDateChange = (date: Date | undefined) => {
    setFormData({
      ...formData,
      birthDate: date || null,
    });
    
    setBirthDateInput(date ? format(date, "MM/dd/yyyy") : "");
  };

  const handleBirthDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatDateInputString(e.target.value);
    setBirthDateInput(formattedValue);
    
    const parsedDate = parseDateInput(formattedValue);
    if (parsedDate) {
      setFormData({
        ...formData,
        birthDate: parsedDate,
      });
    }
  };

  // Location date handling
  const handleLocationDateChange = (id: string, field: "startDate" | "endDate", date: Date | undefined) => {
    setFormData({
      ...formData,
      locations: formData.locations.map((loc) =>
        loc.id === id ? { ...loc, [field]: date || null } : loc
      ),
    });
    
    // Update text inputs when date is selected from calendar
    setLocationDateInputs({
      ...locationDateInputs,
      [id]: {
        ...locationDateInputs[id] || { start: "", end: "" },
        [field === "startDate" ? "start" : "end"]: date ? format(date, "MM/dd/yyyy") : ""
      }
    });
  };

  const handleLocationDateInputChange = (id: string, field: "start" | "end", value: string) => {
    const formattedValue = formatDateInputString(value);
    
    // Update the text input state
    setLocationDateInputs({
      ...locationDateInputs,
      [id]: {
        ...locationDateInputs[id] || { start: "", end: "" },
        [field]: formattedValue
      }
    });
    
    // Parse and update the actual date if valid
    const parsedDate = parseDateInput(formattedValue);
    const dateField = field === "start" ? "startDate" : "endDate";
    
    if (parsedDate) {
      setFormData({
        ...formData,
        locations: formData.locations.map((loc) =>
          loc.id === id ? { ...loc, [dateField]: parsedDate } : loc
        ),
      });
    }
  };

  // Graduation date handling
  const handleGraduationDateChange = (date: Date | undefined) => {
    setFormData({
      ...formData,
      education: {
        ...formData.education,
        graduationDate: date || null,
      },
    });
    
    setGraduationDateInput(date ? format(date, "MM/dd/yyyy") : "");
  };

  const handleGraduationDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatDateInputString(e.target.value);
    setGraduationDateInput(formattedValue);
    
    const parsedDate = parseDateInput(formattedValue);
    if (parsedDate) {
      setFormData({
        ...formData,
        education: {
          ...formData.education,
          graduationDate: parsedDate,
        },
      });
    }
  };

  // Location management
  const addLocation = () => {
    const newId = "loc-" + Math.random().toString(36).substring(2, 9);
    
    // Get the last location's end date if available
    let startDate = null;
    let startDateInput = "";
    
    if (formData.locations.length > 0) {
      const lastLocation = formData.locations[formData.locations.length - 1];
      if (lastLocation.endDate) {
        startDate = lastLocation.endDate;
        startDateInput = format(lastLocation.endDate, "MM/dd/yyyy");
      }
    }
    
    setFormData({
      ...formData,
      locations: [
        ...formData.locations,
        {
          id: newId,
          place: "",
          startDate: startDate,
          endDate: null,
        },
      ],
    });
    
    // Initialize the text inputs for the new location, with the start date from the previous location
    setLocationDateInputs({
      ...locationDateInputs,
      [newId]: { 
        start: startDateInput, 
        end: "" 
      }
    });

    toast.success("New location added");
  };

  const removeLocation = (id: string) => {
    if (formData.locations.length <= 1) {
      toast.error("You must have at least one location");
      return;
    }
    
    setFormData({
      ...formData,
      locations: formData.locations.filter((loc) => loc.id !== id),
    });
    
    // Remove this location from the text inputs state
    const newLocationDateInputs = { ...locationDateInputs };
    delete newLocationDateInputs[id];
    setLocationDateInputs(newLocationDateInputs);

    toast.success("Location removed");
  };

  // Adding a new function to handle location place changes
  const handleLocationPlaceChange = (id: string, value: string) => {
    setFormData({
      ...formData,
      locations: formData.locations.map((loc) =>
        loc.id === id ? { ...loc, place: value } : loc
      ),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    if (!formData.birthDate) {
      toast.error("Please enter your birth date");
      return;
    }
    
    // Check if at least one location has a place name
    const hasValidLocation = formData.locations.some(loc => loc.place.trim());
    if (!hasValidLocation) {
      toast.error("Please enter at least one location");
      return;
    }
    
    // Ensure all dates are properly formatted with 4-digit years
    const processedFormData = {
      ...formData,
      locations: formData.locations.map(loc => ({
        ...loc,
        // Ensure we have proper Date objects, not just strings
        startDate: loc.startDate instanceof Date ? loc.startDate : 
                  (loc.startDate ? new Date(loc.startDate) : null),
        endDate: loc.endDate instanceof Date ? loc.endDate : 
                (loc.endDate ? new Date(loc.endDate) : null)
      }))
    };
    
    // Log the data being submitted
    console.log("Submitting background data:", processedFormData);
    
    onSubmit(processedFormData);
    toast.success("Background information saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Background
          </DialogTitle>
          <DialogDescription>
            This information helps personalize your financial insights. All data stays on your device.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">
              What is your name?
            </Label>
            <div className="relative">
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="pl-9"
                placeholder="Enter your full name"
              />
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-base font-medium">
              When were you born?
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  id="birthDateInput"
                  placeholder="MM/DD/YYYY"
                  value={birthDateInput}
                  onChange={handleBirthDateInputChange}
                  className="pl-9"
                />
                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-9 pr-3 text-left font-normal flex justify-between items-center",
                      !formData.birthDate && "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formData.birthDate ? (
                        format(formData.birthDate, "MMMM d, yyyy")
                      ) : (
                        <span>Select your birth date</span>
                      )}
                    </div>
                    <CalendarLucideIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.birthDate || undefined}
                    onSelect={handleBirthDateChange}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Where have you lived?
              </Label>
              <Button 
                type="button" 
                onClick={addLocation}
                variant="outline" 
                size="sm" 
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Location
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.locations.map((location, index) => (
                <div
                  key={location.id}
                  className="grid grid-cols-1 gap-3 p-3 border rounded-md relative bg-card shadow-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-primary" />
                      Location {index + 1}
                    </h4>
                    {formData.locations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => removeLocation(location.id)}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <Input
                      placeholder="Location"
                      value={location.place}
                      onChange={(e) =>
                        handleLocationPlaceChange(location.id, e.target.value)
                      }
                      className="pl-9"
                    />
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm mb-1 text-muted-foreground">From (MM/DD/YYYY)</p>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="MM/DD/YYYY"
                            value={locationDateInputs[location.id]?.start || ""}
                            onChange={(e) => handleLocationDateInputChange(location.id, "start", e.target.value)}
                            className="pl-9"
                          />
                          <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-10 w-10 p-0 flex items-center justify-center"
                            >
                              <CalendarLucideIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={location.startDate || undefined}
                              onSelect={(date) => handleLocationDateChange(location.id, "startDate", date)}
                              disabled={(date) => location.endDate ? date > location.endDate : date > new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm mb-1 text-muted-foreground">To (MM/DD/YYYY)</p>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="MM/DD/YYYY"
                            value={locationDateInputs[location.id]?.end || ""}
                            onChange={(e) => handleLocationDateInputChange(location.id, "end", e.target.value)}
                            className="pl-9"
                          />
                          <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-10 w-10 p-0 flex items-center justify-center"
                            >
                              <CalendarLucideIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={location.endDate || undefined}
                              onSelect={(date) => handleLocationDateChange(location.id, "endDate", date)}
                              disabled={(date) => location.startDate ? date < location.startDate : date > new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {formData.locations.length > 0 && (
                <div className="flex justify-center mt-2">
                  <Button
                    type="button"
                    onClick={addLocation}
                    variant="secondary"
                    size="sm"
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Another Location
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              What is your highest level of education?
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <select
                  name="education.level"
                  value={formData.education.level}
                  onChange={handleInputChange}
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select education level</option>
                  {educationLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="relative">
                <Input
                  name="education.school"
                  placeholder="School or Institution"
                  value={formData.education.school}
                  onChange={handleInputChange}
                  className="pl-9"
                />
                <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="relative">
                <Input
                  name="education.major"
                  placeholder="Major or Field of Study"
                  value={formData.education.major}
                  onChange={handleInputChange}
                  className="pl-9"
                />
                <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {/* Graduation Date */}
            <div>
              <Label className="text-sm font-medium mb-1 block">
                Graduation Date (or Expected)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    placeholder="MM/DD/YYYY"
                    value={graduationDateInput}
                    onChange={handleGraduationDateInputChange}
                    className="pl-9"
                  />
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-9 pr-3 text-left font-normal flex justify-between items-center",
                        !formData.education.graduationDate && "text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formData.education.graduationDate ? (
                          format(formData.education.graduationDate, "MMMM d, yyyy")
                        ) : (
                          <span>Select graduation date</span>
                        )}
                      </div>
                      <CalendarLucideIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.education.graduationDate || undefined}
                      onSelect={handleGraduationDateChange}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Information</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
