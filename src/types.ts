import { ID } from "@vendure/core"

export interface TaskMessage{
    taskName: string
    tag: 'Medium Priority' | 'High Priority' | 'Low Priority' | 'Medium Priority' | 'In Progress'
    orderId: ID
    state: string
    code: string
    colorType: 'error' | 'success' | 'warning'
}