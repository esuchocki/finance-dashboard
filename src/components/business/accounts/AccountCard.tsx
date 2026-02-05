import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BankAccount } from "@/lib/types";
import { Calendar, FileText, Trash2, Building2, CreditCard, Wallet, Landmark } from "lucide-react";
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

interface AccountCardProps {
  account: BankAccount;
  onRemove: (accountId: string) => void;
  isSelected?: boolean;
  onSelect?: (accountId: string) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onRemove, isSelected, onSelect }) => {
  const getAccountIcon = () => {
    switch (account.accountType) {
      case 'checking':
        return <FileText className="h-5 w-5" />;
      case 'savings':
        return <Wallet className="h-5 w-5" />;
      case 'mma':
        return <Landmark className="h-5 w-5" />;
      case 'credit':
        return <CreditCard className="h-5 w-5" />;
      case 'paypal':
        return <Building2 className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getAccountTypeColor = () => {
    switch (account.accountType) {
      case 'checking':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'savings':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'mma':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'credit':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'paypal':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
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
      onClick={() => onSelect?.(account.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getAccountIcon()}
            <div>
              <CardTitle className="text-lg">{account.name}</CardTitle>
              <CardDescription className="text-xs mt-1 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {account.institutionName}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={`${getAccountTypeColor()} capitalize`}>
            {account.accountType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="font-medium">{account.transactionCount.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Date Range</p>
              <p className="font-medium text-xs">
                {formatDate(account.dateRange.start)} - {formatDate(account.dateRange.end)}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Source: {account.fileSource}
        </div>

        <div className="text-xs text-muted-foreground">
          Uploaded: {formatDate(account.dateUploaded)}
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
                <AlertDialogTitle>Remove Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{account.name}" from {account.institutionName}? This will delete {account.transactionCount} transactions from storage. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(account.id);
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Remove Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountCard;
