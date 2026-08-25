export type ScheduleType = 'fixed' | 'expanding';

export type Database = {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string;
          teacher_id: string;
          name: string;
          schedule_type: ScheduleType;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id?: string;
          name: string;
          schedule_type: ScheduleType;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          name?: string;
          schedule_type?: ScheduleType;
          created_at?: string;
        };
        Relationships: [];
      };
      spelling_lists: {
        Row: {
          id: string;
          class_id: string;
          name: string;
          teaching_week: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          name: string;
          teaching_week: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          name?: string;
          teaching_week?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      spelling_words: {
        Row: {
          id: string;
          spelling_list_id: string;
          word: string;
          definition: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          spelling_list_id: string;
          word: string;
          definition: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          spelling_list_id?: string;
          word?: string;
          definition?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          spelling_list_id: string;
          class_id: string;
          review_number: number;
          scheduled_week: number;
          status: 'pending' | 'completed';
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          spelling_list_id: string;
          class_id: string;
          review_number: number;
          scheduled_week: number;
          status?: 'pending' | 'completed';
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          spelling_list_id?: string;
          class_id?: string;
          review_number?: number;
          scheduled_week?: number;
          status?: 'pending' | 'completed';
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
