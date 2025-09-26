// Расширенные типы для полной спецификации
export type TaskType = 
  | 'story' 
  | 'task' 
  | 'bug' 
  | 'test' 
  | 'meeting_room' 
  | 'document_box' 
  | 'resource' 
  | 'blocker'

export type TaskStatus = 
  | 'open' 
  | 'backlog' 
  | 'ready_for_dev' 
  | 'in_progress' 
  | 'ready_for_review' 
  | 'in_review' 
  | 'in_test' 
  | 'done' 
  | 'completed' 
  | 'blocked' 
  | 'paused' 
  | 'archived' 
  | 'dropped'

export type SpecialistType = 
  | 'designer' 
  | 'frontend' 
  | 'backend' 
  | 'qa' 
  | 'pm' 
  | 'devops'

export type ConnectionType = 
  | 'dependency' 
  | 'blocker' 
  | 'related' 
  | 'test_for'

export interface Epic {
  id: string
  name: string
  color: number // hex color as number
  description?: string
  project_id: string
  created_at: string
  updated_at: string
  status: string
}

export interface Enhanced3DTask {
  id: string
  name: string
  description?: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
  storyPoints: number
  assignee?: string
  epic_id?: string
  created_at: string
  updated_at: string
  position?: {
    x: number
    y: number
  }
  connections?: Connection[]
}

export interface TaskConnection {
  id: string
  from_task_id: string
  to_task_id: string
  connection_type: ConnectionType
}

export interface Object3DSettings {
  id: string
  object_type: TaskType
  status: TaskStatus
  model_config: {
    height: number
    transparency: number
    cracks?: boolean
    repair_tools?: boolean
    repaired?: boolean
  }
  animation_config: {
    pulse?: boolean
    construction?: boolean
    dust?: boolean
    repair?: boolean
  }
  material_config: {
    color: string
    wireframe?: boolean
    emissive?: number
  }
}

export interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  color: string
  icon?: string
  tasks_count?: number
  progress?: number
  type?: string
}

export interface ProjectCard {
  id: string
  title: string
  description?: string
  lastModified: string
  icon: string
  color: string
  progress?: number
  tasksCount?: number
}

export interface Task {
  id: string
  x: number // гексагональная координата X
  y: number // гексагональная координата Y
  type: 'story' | 'task' | 'bug'
  name: string
  status: 'todo' | 'in-progress' | 'done'
  epicColor: number // цвет эпика
  description: string
  assignee: string
  priority: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
  storyPoints: number
  labels: string[]
  comments: Comment[]
  project_id: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  author: string
  text: string
  timestamp: string
  task_id: string
  created_at: string
}

// Интерфейс для объектов зон
export interface ZoneObject {
  id: string
  zone_id: string
  object_type: 'story' | 'task' | 'bug' | 'test' | 'mountain' | 'castle' | 'house' | 'garden' | 'factory' | 'helipad'
  title: string
  description?: string
  status: string
  priority: string
  story_points?: number
  assignee_id?: string | null
  q: number
  r: number
  created_by?: string | null
  created_at: string
  updated_at: string
  // color удален - цвет зоны хранится только в zones.color
}

// Новый интерфейс для тикетов объектов зон
export interface ZoneObjectTicket {
  id: string
  zone_object_id: string
  type: 'story' | 'task' | 'bug' | 'test'
  title: string
  status: 'open' | 'in_progress' | 'done'
  priority: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
  assignee_id?: string | null
  value?: number // Ценность тикета в алмазах
  description?: string
  checklist?: Array<{ id: string; text: string; done: boolean }>
  links?: Array<{ id: string; url: string }>
  comments?: Array<{ id: string; author: string; text: string; ts: string }>
  attachments?: Array<{ id: string; name: string }>
  created_at: string
  updated_at: string
}

export interface HexCoord {
  q: number // кубическая координата q
  r: number // кубическая координата r
  s: number // кубическая координата s (q + r + s = 0)
}

export interface HexTile {
  coord: HexCoord
  type: 'land' | 'water' | 'building' | 'task'
  color: string
  height: number
  content?: Task
}

export interface Connection {
  id: string
  source_task_id: string
  target_task_id: string
  type: ConnectionType
  created_at: string
}

// Новые типы для зон и ячеек
export interface Zone {
  id: string
  name: string
  color: string
  project_id: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface ZoneCell {
  id: string
  zone_id: string
  q: number // гексагональная координата q
  r: number // гексагональная координата r
  created_at: string
}

export interface HexCell {
  id: string
  project_id: string
  q: number // гексагональная координата q
  r: number // гексагональная координата r
  type: 'project-center' | 'building-slot' | 'hidden-slot'
  state: 'empty' | 'occupied' | 'highlighted' | 'hidden'
  building_type?: string | null
  category?: string
  task_name?: string
  progress?: number
  priority?: number
  zone_id?: string | null
  created_at: string
  updated_at: string
}

export interface Building {
  id: string
  project_id: string
  q: number
  r: number
  building_type: 'house' | 'tree' | 'factory'
  category: string
  task_name: string
  progress: number
  priority: number
  created_at: string
  updated_at: string
}
