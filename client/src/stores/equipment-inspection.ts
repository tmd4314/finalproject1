import { defineStore } from 'pinia'

export interface InspectionPart {
  inspect_part_id: number
  inspect_part_name: string
}

export interface InspectionData {
  operator_id: number | null
  equipment_name: string
  inspection_type_code: string
  checked_parts: InspectionPart[]
  result_code: string
  inspection_remark: string
  confirmer_id: number | null
}

export interface InspectionState {
  data: InspectionData
  isInProgress: boolean
  inspection_log_id?: number
}

export const useInspectionStore = defineStore({
  id: 'inspection',
  
  state: () => ({
    inProgressInspections: {} as Record<string, InspectionState>
  }),
  
  actions: {
    save(eq_id: string, payload: InspectionState) {
      this.inProgressInspections[eq_id] = {
        ...payload,
        data: { ...payload.data }
      }
    },
    
    get(eq_id: string): InspectionState | null {
      return this.inProgressInspections[eq_id] || null
    },
    
    clear(eq_id: string) {
      delete this.inProgressInspections[eq_id]
    },
    
    updateInspectionLogId(eq_id: string, inspection_log_id: number) {
      if (this.inProgressInspections[eq_id]) {
        this.inProgressInspections[eq_id].inspection_log_id = inspection_log_id
      }
    },
    
    getAllInProgress() {
      return Object.entries(this.inProgressInspections)
        .filter(([_, state]) => state.isInProgress)
        .map(([eq_id, state]) => ({
          eq_id,
          data: state.data
        }))
    },
    
    isInProgress(eq_id: string): boolean {
      const inspection = this.inProgressInspections[eq_id]
      return inspection ? inspection.isInProgress : false
    }
  },
  
  getters: {
    inProgressCount(): number {
      return Object.values(this.inProgressInspections)
        .filter(inspection => inspection.isInProgress).length
    },
    
    getInspectionData() {
      return (eq_id: string): InspectionData | null => {
        return this.inProgressInspections[eq_id]?.data || null
      }
    }
  }
})