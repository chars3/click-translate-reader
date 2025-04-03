
export interface BookInfo {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  progress: number;
  lastOpened: Date;
  file: File;
}
