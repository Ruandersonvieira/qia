"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Category {
  id: string;
  name: string;
  description: string;
}

interface CategoryEditFormProps {
  category: Category;
  onUpdate: (formData: FormData) => Promise<void>;
}

export default function CategoryEditForm({ category, onUpdate }: CategoryEditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("id", category.id);
    formData.set("name", name);
    formData.set("description", description);
    await onUpdate(formData);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
      >
        Editar
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-1">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm"
        required
      />
      <Input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="h-8 text-sm"
      />
      <Button type="submit" size="sm" variant="default">
        Salvar
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setIsEditing(false);
          setName(category.name);
          setDescription(category.description);
        }}
      >
        Cancelar
      </Button>
    </form>
  );
}
