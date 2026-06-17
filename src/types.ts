export interface BookNode {
  id: string;
  title: string;
  author?: string;
  color: string;
  children: BookNode[];
}
