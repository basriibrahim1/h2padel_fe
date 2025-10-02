// @/components/SelectWithAddAndSearch.tsx

"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SelectOption {
  value: string | number;
  label: string;
  data: any;
}

interface NewPersonEntry {
  name: string;
  phone?: string;
  address?: string;
  maps_url?: string;
  fixed_price?: number;
  fee?: number;
  email?: string;
  password?: string;
}

interface SelectWithAddAndSearchProps {
  label: string;
  placeholder: string;
  options: SelectOption[];
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  onAddNew: (newEntry: NewPersonEntry) => Promise<void>;
  type: "client" | "coach" | "court";
}

export const SelectWithAddAndSearch: React.FC<SelectWithAddAndSearchProps> = ({ label, placeholder, options, selectedValue, onValueChange, onAddNew, type }) => {
  const [openCombobox, setOpenCombobox] = React.useState(false);
  const [openDialog, setOpenDialog] = React.useState(false);

  // State untuk form penambahan baru
  const [newEntryName, setNewEntryName] = React.useState("");
  const [newEntryPhone, setNewEntryPhone] = React.useState("");
  const [newEntryEmail, setNewEntryEmail] = React.useState("");
  const [newEntryPassword, setNewEntryPassword] = React.useState("");
  const [newEntryFee, setNewEntryFee] = React.useState<number | undefined>(undefined);

  // State untuk COURT
  const [newEntryAddress, setNewEntryAddress] = React.useState("");
  const [newEntryMapsUrl, setNewEntryMapsUrl] = React.useState("");
  const [newEntryPrice, setNewEntryPrice] = React.useState<number | undefined>(undefined);

  const [isAdding, setIsAdding] = React.useState(false);

  const currentLabel = selectedValue ? options.find((option) => option.value === selectedValue)?.label : placeholder;

  const resetForm = () => {
    setNewEntryName("");
    setNewEntryPhone("");
    setNewEntryEmail("");
    setNewEntryPassword("");
    setNewEntryFee(undefined);
    setNewEntryAddress("");
    setNewEntryMapsUrl("");
    setNewEntryPrice(undefined);
    setOpenDialog(false);
  };

  const handleAddNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Logika Validasi ---
    if (!newEntryName) {
      toast.error(`Nama ${label} wajib diisi.`);
      return;
    }

    let entryData: NewPersonEntry = { name: newEntryName };

    if (type === "client" || type === "coach") {
      if (!newEntryPhone || !newEntryEmail || !newEntryPassword) {
        toast.error(`Email, Telepon, dan Password wajib diisi untuk registrasi.`);
        return;
      }
      entryData = {
        name: newEntryName,
        phone: newEntryPhone,
        email: newEntryEmail,
        password: newEntryPassword,
        fee: type === "coach" ? newEntryFee : undefined,
      };
    } else if (type === "court") {
      if (!newEntryAddress || !newEntryPrice) {
        toast.error(`Alamat dan Harga Court wajib diisi.`);
        return;
      }
      entryData = {
        name: newEntryName,
        address: newEntryAddress,
        maps_url: newEntryMapsUrl,
        fixed_price: newEntryPrice,
      };
    }

    setIsAdding(true);
    try {
      await onAddNew(entryData);
      resetForm();
    } catch (error) {
      // Error handling dilakukan oleh parent component
    } finally {
      setIsAdding(false);
    }
  };

  const renderFormInputs = () => {
    if (type === "client" || type === "coach") {
      return (
        <>
          <div className="space-y-1">
            <Label htmlFor="new_name">Nama Lengkap</Label>
            <Input id="new_name" value={newEntryName} onChange={(e) => setNewEntryName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new_phone">Nomor Telepon</Label>
            <Input id="new_phone" type="tel" value={newEntryPhone} onChange={(e) => setNewEntryPhone(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new_email">Email</Label>
            <Input id="new_email" type="email" value={newEntryEmail} onChange={(e) => setNewEntryEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new_password">Password (Min. 6 Karakter)</Label>
            <Input id="new_password" type="password" value={newEntryPassword} onChange={(e) => setNewEntryPassword(e.target.value)} required />
          </div>
          {type === "coach" && (
            <div className="space-y-1">
              <Label htmlFor="new_fee">Fixed Fee (Rp)</Label>
              <Input id="new_fee" type="number" value={newEntryFee ?? ""} onChange={(e) => setNewEntryFee(Number(e.target.value))} />
            </div>
          )}
        </>
      );
    }

    if (type === "court") {
      return (
        <>
          <div className="space-y-1">
            <Label htmlFor="new_court_name">Nama Court</Label>
            <Input id="new_court_name" value={newEntryName} onChange={(e) => setNewEntryName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new_court_price">Harga Sewa (Rp)</Label>
            <Input id="new_court_price" type="number" value={newEntryPrice ?? ""} onChange={(e) => setNewEntryPrice(Number(e.target.value))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new_court_address">Alamat Court</Label>
            <Input id="new_court_address" value={newEntryAddress} onChange={(e) => setNewEntryAddress(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new_court_maps">Link Google Maps (Opsional)</Label>
            <Input id="new_court_maps" value={newEntryMapsUrl} onChange={(e) => setNewEntryMapsUrl(e.target.value)} />
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="space-y-1 w-full">
      <Label htmlFor={type + "_select"}>{label}</Label>
      <div className="flex space-x-2">
        {/* COMBOBOX (SELECT WITH SEARCH) */}
        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between font-normal">
              {currentLabel || placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder={`Cari ${label}...`} />
              <CommandEmpty>Tidak ada {label} yang ditemukan.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value === selectedValue ? "" : option.value);
                      setOpenCombobox(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedValue === option.value ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* DIALOG TRIGGER (ADD NEW BUTTON) */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" title={`Tambah ${label} Baru`}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                Tambah {label} Baru {type === "client" || type === "coach" ? "(Registrasi Admin)" : ""}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddNewSubmit} className="grid gap-4 py-4">
              {renderFormInputs()}

              <Button type="submit" disabled={isAdding} className="mt-4">
                {isAdding ? (type === "court" ? "Menyimpan..." : "Mendaftarkan...") : `Tambah ${label}`}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
