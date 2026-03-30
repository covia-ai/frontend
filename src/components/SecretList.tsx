"use client";

import { useEffect, useMemo, useState } from "react";
import { Venue } from "@covia/covia-sdk";
import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { KeyRound, Loader2, Plus, Trash2, EyeOff } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
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

export function SecretList() {
  const [secrets, setSecrets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  const venue = useMemo(() => {
    if (!venueObj) return null;
    return new Venue({
      baseUrl: venueObj?.baseUrl,
      venueId: venueObj?.venueId,
      name: venueObj?.metadata?.name,
    });
  }, [venueObj]);

  const loadSecrets = () => {
    if (!venue) {
      setLoading(false);
      return;
    }
    setLoading(true);
    venue.secrets
      .list()
      .then((result) => {
        setSecrets(result || []);
      })
      .catch(() => {
        toast("Unable to load secrets");
        setSecrets([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSecrets();
  }, [venue]);

  const handleAdd = () => {
    if (!venue || !newName.trim() || !newValue.trim()) {
      toast("Name and value are required");
      return;
    }
    setAdding(true);
    venue.secrets
      .put(newName.trim(), newValue)
      .then(() => {
        toast(`Secret "${newName}" stored`);
        setNewName("");
        setNewValue("");
        loadSecrets();
      })
      .catch(() => {
        toast("Unable to store secret");
      })
      .finally(() => {
        setAdding(false);
      });
  };

  const handleDelete = (name: string) => {
    if (!venue) return;
    venue.secrets
      .delete(name)
      .then(() => {
        toast(`Secret "${name}" deleted`);
        loadSecrets();
      })
      .catch(() => {
        toast("Unable to delete secret");
      });
  };

  if (!venue) {
    return (
      <div className="flex h-[200px] w-full border border-border rounded-lg items-center justify-center text-muted-foreground">
        <KeyRound size={32} className="mr-2" />
        <p className="text-sm">Select a venue to manage secrets</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add Secret Form */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus size={16} /> Add Secret
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Secret name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Input
            type="password"
            placeholder="Secret value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={adding || !newName.trim() || !newValue.trim()}>
            {adding ? "Storing..." : "Add"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Secret values are write-only and cannot be revealed after storage.
        </p>
      </div>

      {/* Secrets List */}
      <div className="border border-border rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}

        {!loading && secrets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <KeyRound size={32} />
            <p className="text-sm mt-2">No secrets stored</p>
          </div>
        )}

        {!loading && secrets.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableCell className="font-semibold text-sm">Name</TableCell>
                <TableCell className="font-semibold text-sm">Value</TableCell>
                <TableCell className="font-semibold text-sm w-20">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {secrets.map((name) => (
                <TableRow key={name}>
                  <TableCell className="font-mono text-sm">{name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <span className="flex items-center gap-1">
                      <EyeOff size={14} /> ••••••••
                    </span>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete secret &quot;{name}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(name)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
