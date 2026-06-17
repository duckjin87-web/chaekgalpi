# chaekgalpi 스펙

## 개요
책장(Shelf) 위에 책(BookNode)을 꽂아두는 시각화 앱. 책은 하위 책을 가질 수 있는 트리 구조다.

## 데이터 모델
```ts
interface BookNode {
  id: string;
  title: string;
  author?: string;
  color: string;       // 책등 색상
  children: BookNode[]; // 하위 책
}
```

## 화면 구성
- **Shelf**: `BookNode[]`를 한 줄의 책장으로 렌더링.
- **BookNode**: 책 한 권(BookSpine)과, 펼쳤을 때 하위 책들을 보여주는 중첩 Shelf.
- **BookSpine**: 책장 위에서 보이는 책 한 권의 모양(세로 제목, 색상).
- **Editor**: 선택한 책의 제목/작가/색상을 수정하고, 하위 책 추가·삭제.

## 동작
1. BookSpine을 클릭하면 해당 책이 선택되고 Editor에 정보가 표시된다.
2. 하위 책이 있는 책은 펼치기/접기 버튼으로 중첩 Shelf를 토글한다.
3. Editor에서 하위 책 추가, 삭제, 필드 수정이 가능하다.
