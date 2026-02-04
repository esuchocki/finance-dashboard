import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BusinessEntity } from "@/lib/types";
import { Calendar, FileText, Trash2, Building2, Landmark, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EntityCardProps {
  entity: BusinessEntity;
  onRemove: (entityId: string) => void;
  isSelected?: boolean;
  onSelect?: (entityId: string) => void;
}

const EntityCard: React.FC<EntityCardProps> = ({ entity, onRemove, isSelected, onSelect }) => {
  const getEntityIcon = () => {
    switch (entity.type) {
      case 'operating':
        return <Building2 className="h-5 w-5" />;
      case 'capital':
        return <Landmark className="h-5 w-5" />;
      case 'restricted':
        return <Wallet className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getEntityTypeColor = () => {
    switch (entity.type) {
      case 'operating':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'capital':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'restricted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(entity.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getEntityIcon()}
            <div>
              <CardTitle className="text-lg">{entity.name}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {entity.fileSource}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={getEntityTypeColor()}>
            {entity.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="font-medium">{entity.transactionCount.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Date Range</p>
              <p className="font-medium text-xs">
                {formatDate(entity.dateRange.start)} - {formatDate(entity.dateRange.end)}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Uploaded: {formatDate(entity.dateUploaded)}
        </div>

        <div className="flex gap-2 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Entity</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{entity.name}"? This will delete {entity.transactionCount} transactions from storage. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(entity.id);
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Remove Entity
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default EntityCard;
