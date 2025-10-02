"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle, Pencil } from "lucide-react";
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
  data: any; // Harus berisi { id, user_id, name, ... } untuk person
}

interface PersonDataForEdit {
  id: string; // PK Lokal (misal clients.id)
  user_id: string; // UUID Auth (profiles.id) - PENTING
  name: string;
  phone?: string;
  email?: string;
  fixed_fee?: number; // Ganti 'fee' menjadi 'fixed_fee' agar sesuai dengan PersonData di page.tsx
}

interface CourtDataForEdit {
  id: number;
  name: string;
  address?: string;
  maps_url?: string;
  fixed_price?: number;
}

// Interface yang sama untuk kiriman data baru/edit
interface NewPersonEntry {
  name: string;
  phone?: string;
  address?: string;
  maps_url?: string;
  fixed_price?: number;
  fee?: number;
  email?: string;
  password?: string;
  // Tambahkan ID untuk operasi edit
  id?: string | number;
  user_id?: string; // <--- PENTING: UUID Auth untuk edit Person
}

interface SelectWithAddAndSearchProps {
  label: string;
  placeholder: string;
  options: SelectOption[];
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  onAddNew: (newEntry: NewPersonEntry) => Promise<void>;
  onEdit: (updatedEntry: NewPersonEntry) => Promise<void>;
  type: "client" | "coach" | "court";
}

export const SelectWithAddAndSearch: React.FC<SelectWithAddAndSearchProps> = ({ label, placeholder, options, selectedValue, onValueChange, onAddNew, onEdit, type }) => {
  const [openCombobox, setOpenCombobox] = React.useState(false);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);

  // State untuk menyimpan PK Lokal (id) dan UUID Auth (user_id) dari item yang sedang diedit
  const [currentEditId, setCurrentEditId] = React.useState<string | number | undefined>(undefined);
  const [currentEditUserId, setCurrentEditUserId] = React.useState<string | undefined>(undefined); // <--- NEW STATE UNTUK USER_ID

  // State untuk form
  const [newEntryName, setNewEntryName] = React.useState("");
  const [newEntryPhone, setNewEntryPhone] = React.useState("");
  const [newEntryEmail, setNewEntryEmail] = React.useState("");
  const [newEntryPassword, setNewEntryPassword] = React.useState("");
  const [newEntryFee, setNewEntryFee] = React.useState<number | undefined>(undefined);

  // State untuk COURT
  const [newEntryAddress, setNewEntryAddress] = React.useState("");
  const [newEntryMapsUrl, setNewEntryMapsUrl] = React.useState("");
  const [newEntryPrice, setNewEntryPrice] = React.useState<number | undefined>(undefined);

  const [isProcessing, setIsProcessing] = React.useState(false);

  const currentSelectedOption = options.find((option) => option.value === selectedValue);
  const currentLabel = currentSelectedOption ? currentSelectedOption.label : placeholder;

  const resetForm = () => {
    setNewEntryName("");
    setNewEntryPhone("");
    setNewEntryEmail("");
    setNewEntryPassword("");
    setNewEntryFee(undefined);
    setNewEntryAddress("");
    setNewEntryMapsUrl("");
    setNewEntryPrice(undefined);
    setIsEditMode(false);
    setCurrentEditId(undefined);
    setCurrentEditUserId(undefined); // <--- RESET USER_ID
    setOpenDialog(false);
  };

  const handleOpenEdit = (option: SelectOption) => {
    // Set mode edit dan isi form dengan data yang dipilih
    setIsEditMode(true);
    setCurrentEditId(option.value);
    setNewEntryName(option.data.name || option.data.court_name || ""); // 'name' atau 'court_name'

    if (type === "client" || type === "coach") {
      // Perluas tipe data yang diterima untuk memastikan user_id ada
      const data = option.data as PersonDataForEdit & { user_id: string };

      // V KRITIS: Simpan user_id (UUID Auth) dari data yang dipilih V
      setCurrentEditUserId(data.user_id);

      setNewEntryPhone(data.phone || "");
      setNewEntryEmail(data.email || "");

      if (type === "coach") {
        setNewEntryFee(data.fixed_fee); // Gunakan fixed_fee
      }
    } else if (type === "court") {
      const data = option.data as CourtDataForEdit;
      setNewEntryAddress(data.address || "");
      setNewEntryMapsUrl(data.maps_url || "");
      setNewEntryPrice(data.fixed_price);
    }

    setOpenCombobox(false);
    setOpenDialog(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEditMode(false);
    setOpenDialog(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Logika Validasi ---
    if (!newEntryName) {
      toast.error(`Nama ${label} wajib diisi.`);
      return;
    }

    let entryData: NewPersonEntry = {
      name: newEntryName,
      // PK Lokal (clients.id/coaches.id/court.id)
      id: isEditMode ? currentEditId : undefined,
    };

    if (type === "client" || type === "coach") {
      // Validasi wajib untuk tambah baru
      if (!isEditMode && (!newEntryPhone || !newEntryEmail || !newEntryPassword)) {
        toast.error(`Email, Telepon, dan Password wajib diisi untuk registrasi.`);
        return;
      }

      entryData = {
        ...entryData,
        phone: newEntryPhone,
        email: newEntryEmail || undefined,
        password: newEntryPassword || undefined,
        fee: type === "coach" ? newEntryFee : undefined,

        // V KRITIS: Tambahkan user_id (UUID Auth) saat mode edit V
        ...(isEditMode && { user_id: currentEditUserId }),
      };

      // Validasi user_id saat mode edit person
      if (isEditMode && !entryData.user_id) {
        toast.error("Gagal edit: UUID Auth (user_id) tidak ditemukan. Mohon ulangi pemilihan.");
        return;
      }
    } else if (type === "court") {
      if (!newEntryAddress || !newEntryPrice) {
        toast.error(`Alamat dan Harga Court wajib diisi.`);
        return;
      }
      entryData = {
        ...entryData,
        address: newEntryAddress,
        maps_url: newEntryMapsUrl,
        fixed_price: newEntryPrice,
      };
    }

    setIsProcessing(true);
    try {
      if (isEditMode) {
        if (!entryData.id) {
          toast.error("Gagal edit: PK Lokal ID data tidak ditemukan.");
          return;
        }
        await onEdit(entryData);
        toast.success(`${label} berhasil diupdate!`);
      } else {
        await onAddNew(entryData);
      }
      resetForm();
    } catch (error: any) {
      const errorMessage = error.message || `Gagal ${isEditMode ? "mengedit" : "menambahkan"} data.`;
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
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
            <Label htmlFor="new_email">Email {isEditMode ? "(Kosongkan jika tidak diubah)" : ""}</Label>
            <Input id="new_email" type="email" value={newEntryEmail} onChange={(e) => setNewEntryEmail(e.target.value)} required={!isEditMode} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new_password">Password {isEditMode ? "(Isi untuk mengganti)" : "(Wajib diisi)"}</Label>
            <Input id="new_password" type="password" value={newEntryPassword} onChange={(e) => setNewEntryPassword(e.target.value)} required={!isEditMode} />
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

                    {/* NEW: Tombol Edit muncul jika item ini adalah yang terpilih */}
                    {selectedValue === option.value && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(option);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                      </Button>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* DIALOG TRIGGER (ADD NEW BUTTON) */}
        <Dialog
          open={openDialog}
          onOpenChange={(open) => {
            setOpenDialog(open);
            if (!open) resetForm(); // Reset form jika dialog ditutup
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" title={`Tambah ${label} Baru`} onClick={handleOpenAdd}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isEditMode ? `Edit ${label}: ${newEntryName}` : `Tambah ${label} Baru`}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {renderFormInputs()}

              <Button type="button" onClick={handleFormSubmit} disabled={isProcessing} className="mt-4">
                {isProcessing ? (isEditMode ? "Mengupdate..." : "Menambahkan...") : isEditMode ? `Simpan Perubahan` : `Tambah ${label}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
