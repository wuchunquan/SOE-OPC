<template>
  <div class="todo-list">
    <!-- 任务列表 -->
    <div class="todo-items">
      <div
        v-for="(todo, index) in todos"
        :key="index"
        class="todo-item"
        :class="todoItemClass(todo)"
      >
        <div class="todo-row">
          <!-- 状态图标 -->
          <div class="todo-icon">
            {{ getStatusIcon(todo.status) }}
          </div>

          <!-- 任务内容 -->
          <div class="todo-content">
            {{ todo.status === 'in_progress' ? todo.activeForm : todo.content }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Todo {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
}

interface Props {
  todos: Todo[]
}

const props = defineProps<Props>()

// 状态图标映射
const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'completed':
      return '✅'
    case 'in_progress':
      return '⭕'
    case 'pending':
      return '⭕'
    default:
      return '⭕'
  }
}

// 任务项样式
const todoItemClass = (todo: Todo): string => {
  switch (todo.status) {
    case 'completed':
      return 'todo-completed'
    case 'in_progress':
      return 'todo-in-progress'
    case 'pending':
      return 'todo-pending'
    default:
      return 'todo-pending'
  }
}
</script>

<style scoped lang="scss">
.todo-list {
  // 融入工具调用显示
}

.todo-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-item {
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.todo-completed {
  opacity: 0.7;

  .todo-content {
    text-decoration: line-through;
    color: var(--el-text-color-secondary);
  }
}

.todo-in-progress {
  // 默认样式
}

.todo-pending {
  // 默认样式
}

.todo-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.todo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 14px;
}

.todo-content {
  flex: 1;
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.6;
}
</style>
