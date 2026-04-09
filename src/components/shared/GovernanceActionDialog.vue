<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type HighlightItem = {
  label: string;
  value: string;
};

withDefaults(
  defineProps<{
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmDisabled?: boolean;
    highlights?: HighlightItem[];
  }>(),
  {
    confirmLabel: "Looks good",
    cancelLabel: "Cancel",
    confirmDisabled: false,
    highlights: () => [],
  },
);

const emit = defineEmits<{
  (e: "confirm"): void;
}>();

const open = defineModel<boolean>("open", { default: false });

const handleConfirm = () => {
  emit("confirm");
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-xl rounded-3xl border-border/70 bg-card/95 p-0 backdrop-blur-xl">
      <DialogHeader class="space-y-3 border-b border-border/60 px-6 py-5">
        <DialogTitle class="text-xl">{{ title }}</DialogTitle>
        <DialogDescription class="text-sm leading-6 text-muted-foreground">
          {{ description }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 px-6 py-5">
        <div v-if="highlights.length" class="grid gap-3 md:grid-cols-2">
          <div
            v-for="item in highlights"
            :key="item.label"
            class="rounded-2xl border border-border/70 bg-background/45 px-4 py-3"
          >
            <div class="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {{ item.label }}
            </div>
            <div class="mt-2 text-base font-semibold tracking-tight">
              {{ item.value }}
            </div>
          </div>
        </div>

        <slot />
      </div>

      <DialogFooter class="border-t border-border/60 px-6 py-4">
        <Button variant="outline" class="rounded-full" @click="open = false">
          {{ cancelLabel }}
        </Button>
        <Button class="rounded-full" :disabled="confirmDisabled" @click="handleConfirm">
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
