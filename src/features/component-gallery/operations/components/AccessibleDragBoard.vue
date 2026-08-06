<script setup lang="ts">
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, GripVertical } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

type BoardLaneId = 'backlog' | 'in-progress' | 'done'

interface BoardCard {
  id: string
  title: string
}

interface BoardLane {
  id: BoardLaneId
  title: string
}

const { locale } = useI18n()
const messages = {
  'en-US': {
    backlog: 'Backlog',
    inProgress: 'In progress',
    done: 'Done',
    moveUp: 'Move up',
    moveDown: 'Move down',
    moveLeft: 'Move to previous lane',
    moveRight: 'Move to next lane',
    instructions: 'Drag cards, use the move buttons, or press Alt plus an arrow key.',
    moved: 'Moved',
    to: 'to',
    position: 'position',
  },
  'zh-CN': {
    backlog: '待处理',
    inProgress: '进行中',
    done: '已完成',
    moveUp: '上移',
    moveDown: '下移',
    moveLeft: '移到前一列',
    moveRight: '移到后一列',
    instructions: '可以拖动卡片、使用移动按钮，或按 Alt 加方向键。',
    moved: '已移动',
    to: '到',
    position: '位置',
  },
} as const
const copy = computed(() => messages[locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'])

const lanes = computed<BoardLane[]>(() => [
  { id: 'backlog', title: copy.value.backlog },
  { id: 'in-progress', title: copy.value.inProgress },
  { id: 'done', title: copy.value.done },
])
const cardsByLane = ref<Record<BoardLaneId, BoardCard[]>>({
  backlog: [
    { id: 'card-access-review', title: 'Review access request' },
    { id: 'card-copy-audit', title: 'Confirm audit copy' },
    { id: 'card-export-policy', title: 'Approve export policy' },
  ],
  'in-progress': [{ id: 'card-release', title: 'Prepare release notes' }],
  done: [{ id: 'card-verify', title: 'Verify recovery path' }],
})
const draggedCardId = ref<string>()
const announcement = ref('')

function findCard(
  cardId: string,
): { laneId: BoardLaneId; index: number; card: BoardCard } | undefined {
  for (const lane of lanes.value) {
    const index = cardsByLane.value[lane.id].findIndex((card) => card.id === cardId)
    const card = cardsByLane.value[lane.id][index]
    if (index >= 0 && card) return { laneId: lane.id, index, card }
  }
  return undefined
}

function reportMove(card: BoardCard, laneId: BoardLaneId, position: number): void {
  const laneTitle = lanes.value.find((lane) => lane.id === laneId)?.title ?? laneId
  announcement.value = `${copy.value.moved} ${card.title} ${copy.value.to} ${laneTitle}, ${copy.value.position} ${position + 1}`
}

function moveWithinLane(cardId: string, offset: -1 | 1): void {
  const location = findCard(cardId)
  if (!location) return
  const cards = cardsByLane.value[location.laneId]
  const requestedIndex = location.index + offset
  if (requestedIndex < 0 || requestedIndex >= cards.length) return
  cards.splice(location.index, 1)
  cards.splice(requestedIndex, 0, location.card)
  reportMove(location.card, location.laneId, requestedIndex)
}

function moveAcrossLanes(cardId: string, offset: -1 | 1): void {
  const location = findCard(cardId)
  if (!location) return
  const sourceLaneIndex = lanes.value.findIndex((lane) => lane.id === location.laneId)
  const targetLane = lanes.value[sourceLaneIndex + offset]
  if (!targetLane) return
  cardsByLane.value[location.laneId].splice(location.index, 1)
  cardsByLane.value[targetLane.id].push(location.card)
  reportMove(location.card, targetLane.id, cardsByLane.value[targetLane.id].length - 1)
}

function startDragging(cardId: string, event: DragEvent): void {
  draggedCardId.value = cardId
  event.dataTransfer?.setData('text/plain', cardId)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function finishDragging(): void {
  draggedCardId.value = undefined
}

function dropAt(laneId: BoardLaneId, targetIndex?: number): void {
  const cardId = draggedCardId.value
  if (!cardId) return
  const location = findCard(cardId)
  if (!location) return

  cardsByLane.value[location.laneId].splice(location.index, 1)
  const targetCards = cardsByLane.value[laneId]
  const requestedIndex = targetIndex ?? targetCards.length
  const insertionIndex =
    location.laneId === laneId && location.index < requestedIndex
      ? Math.max(requestedIndex - 1, 0)
      : Math.min(requestedIndex, targetCards.length)
  targetCards.splice(insertionIndex, 0, location.card)
  reportMove(location.card, laneId, insertionIndex)
  finishDragging()
}

function handleCardKeydown(cardId: string, event: KeyboardEvent): void {
  if (!event.altKey) return
  if (event.key === 'ArrowUp') moveWithinLane(cardId, -1)
  else if (event.key === 'ArrowDown') moveWithinLane(cardId, 1)
  else if (event.key === 'ArrowLeft') moveAcrossLanes(cardId, -1)
  else if (event.key === 'ArrowRight') moveAcrossLanes(cardId, 1)
  else return
  event.preventDefault()
}
</script>

<template>
  <div class="space-y-3">
    <p id="drag-board-instructions" class="text-sm text-muted-foreground">
      {{ copy.instructions }}
    </p>
    <p class="sr-only" role="status" aria-live="polite">
      {{ announcement }}
    </p>

    <div class="grid min-w-0 gap-4 lg:grid-cols-3">
      <section
        v-for="(lane, laneIndex) in lanes"
        :key="lane.id"
        class="min-w-0 rounded-lg border bg-muted/20 p-3"
        :data-board-lane="lane.id"
        @dragover.prevent
        @drop.prevent="dropAt(lane.id)"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="font-semibold">
            {{ lane.title }}
          </h3>
          <span class="text-xs text-muted-foreground">{{ cardsByLane[lane.id].length }}</span>
        </div>

        <ul class="min-h-28 space-y-2" :aria-label="lane.title">
          <li
            v-for="(card, cardIndex) in cardsByLane[lane.id]"
            :key="card.id"
            class="min-w-0 rounded-md border bg-card p-3 shadow-xs"
            :data-board-card="card.id"
            draggable="true"
            tabindex="0"
            aria-describedby="drag-board-instructions"
            @dragstart="startDragging(card.id, $event)"
            @dragend="finishDragging"
            @dragover.prevent
            @drop.prevent.stop="dropAt(lane.id, cardIndex)"
            @keydown="handleCardKeydown(card.id, $event)"
          >
            <div class="flex min-w-0 items-start gap-2">
              <GripVertical
                class="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 break-words text-sm font-medium">{{ card.title }}</span>
            </div>
            <!-- AI modified: every pointer drag operation has visible keyboard/touch button alternatives. -->
            <div class="mt-3 flex min-w-0 flex-wrap gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                :disabled="cardIndex === 0"
                :aria-label="`${copy.moveUp}: ${card.title}`"
                :title="copy.moveUp"
                @click="moveWithinLane(card.id, -1)"
              >
                <ArrowUp class="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                :disabled="cardIndex === cardsByLane[lane.id].length - 1"
                :aria-label="`${copy.moveDown}: ${card.title}`"
                :title="copy.moveDown"
                @click="moveWithinLane(card.id, 1)"
              >
                <ArrowDown class="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                :disabled="laneIndex === 0"
                :aria-label="`${copy.moveLeft}: ${card.title}`"
                :title="copy.moveLeft"
                @click="moveAcrossLanes(card.id, -1)"
              >
                <ArrowLeft class="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                :disabled="laneIndex === lanes.length - 1"
                :aria-label="`${copy.moveRight}: ${card.title}`"
                :title="copy.moveRight"
                @click="moveAcrossLanes(card.id, 1)"
              >
                <ArrowRight class="size-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
