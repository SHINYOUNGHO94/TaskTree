# Task F: File Sharing Tab — Design Document

## 概要

案件詳細画面に File Sharing タブを追加する。
案件ごとのファイルアップロード / ダウンロード / 削除を実現する。
Task B で追加済みの S3 バケット / presigned URL パターンを最大限再利用する。

---

## DynamoDB Access Pattern

### 既存 GSI 構造

```
Table: task-tree (single-table)
GSI: byCase
  pk(GSI) = caseId
  sk(GSI) = caseSortKey
```

`caseSortKey` は `EntityName#createdAt#entityId` 形式。

### CaseFile Record

| フィールド | 型 | 説明 |
|---|---|---|
| pk | `"CaseFile"` | エンティティ名 |
| sk | `Case#${caseId}#CaseFile#${fileId}` | ユニークキー |
| fileId | string | UUID（アップロード URL 発行時にクライアントが生成） |
| caseId | string | 案件 ID（byCase GSI pk） |
| caseSortKey | `CaseFile#${createdAt}#${fileId}` | byCase GSI sk |
| companyId | string | 案件オーナー会社 ID（tenant 分離） |
| uploaderCompanyId | string | アップロード者の会社 ID |
| uploadedBy | string | userId |
| fileName | string | 元ファイル名（表示用、255文字以内） |
| contentType | string | MIME type |
| fileSize | number | bytes |
| objectKey | string | S3 key（Lambda 内部のみ、API response に絶対含めない） |
| at | string | createdAt（ISO 8601） |

**削除ポリシー: hard delete（DynamoDB record 削除 + S3 DeleteObject）。deletedAt フィールドなし。**

**アクセスパターン:**
- 一覧: `byCase` GSI `caseId = :caseId AND begins_with(caseSortKey, "CaseFile#")`
- 単体: Table pk=`CaseFile`, sk=`Case#${caseId}#CaseFile#${fileId}`

---

## S3 Key 設計

```
{companyId}/cases/{caseId}/files/{fileId}
```

split(`/`) = `[companyId, "cases", caseId, "files", fileId]` (5 segments)

### parseCaseFileKey() helper

S3 key の ad hoc な split は禁止。必ず共通 helper を使う。

```typescript
// packages/task-api/src/services/s3KeyService.ts

export interface CaseFileKeyParts {
  companyId: string;
  caseId: string;
  fileId: string;
}

export const buildCaseFileKey = (
  companyId: string,
  caseId: string,
  fileId: string,
): string => `${companyId}/cases/${caseId}/files/${fileId}`;

export const parseCaseFileKey = (key: string): CaseFileKeyParts | null => {
  const parts = key.split("/");
  if (parts.length !== 5) return null;
  if (parts[1] !== "cases") return null;
  if (parts[3] !== "files") return null;
  const [companyId, , caseId, , fileId] = parts;
  if (!companyId || !caseId || !fileId) return null;
  return { companyId, caseId, fileId };
};
```

既存 `getReadPresignedUrl.ts` は変更しない（images ハンドラはそのまま）。

---

## 2-Step Upload フロー

presigned URL 発行時点で DynamoDB に record を作ると、
ユーザーが実際にアップロードしなかった場合に「アップロードされていないファイルが一覧に表示される」問題が発生する。

**解決策: upload-url 発行と record 確定を分離する。**

```
Step 1: POST /cases/{id}/files/upload-url
  → Lambda: 権限確認のみ
  → fileId = randomUUID() を生成
  → buildCaseFileKey(companyId, caseId, fileId) で objectKey 生成
  → presigned POST 発行（Content-Type / Content-Length を Conditions で制限）
  → DynamoDB 書き込みなし
  → Response: { url, fields, fileId }  ← objectKey は含めない

Step 2: クライアントが S3 へ直接 POST（presigned POST）

Step 3: POST /cases/{id}/files（confirm API）
  → body: { fileId, fileName, contentType, fileSize }
  → Lambda: 権限確認
  → objectKey = buildCaseFileKey(companyId, caseId, fileId) を再構築
  → S3 HeadObject でオブジェクト存在確認（未アップロードなら 404 扱いで 400 を返す）
  → HeadObject の ContentLength と body.fileSize の整合性確認（1バイト以上）
  → DynamoDB に CaseFile record を PutItem
  → CaseHistory FILE_UPLOADED 記録
  → Response: { fileId, fileName, contentType, fileSize, createdAt, ... }
    ← objectKey は含めない
```

**フロー全体:**

```
Client          Lambda(upload-url)   S3          Lambda(confirm)   DynamoDB
  |                   |               |                |               |
  |--POST upload-url->|               |                |               |
  |<-{url,fields,fId}-|               |                |               |
  |                                   |                |               |
  |-----FormData POST to S3---------->|                |               |
  |<--201/204--------------------------                |               |
  |                                                    |               |
  |--POST /files {fileId,fileName,...}---------------->|               |
  |                               HeadObject(objectKey)|               |
  |                               <--200 (exists)------                |
  |                                                    |--PutItem----->|
  |                                                    |--History----->|
  |<--201 CaseFile-----------------------------------------|
```

---

## 権限検証順序

**全 API 共通: case 権限確認 → file record 確認 の順序を守る。**

```
1. userId 取得（JWT）
2. profile 取得
3. case 取得（存在確認 + companyId 取得）
4. 権限確認（canReadCase or canReadCaseAsAnyParticipant）
5. file record 取得（fileId が存在するか）
6. file record の companyId / caseId 整合性確認（parseCaseFileKey で検証）
7. 操作実行
```

case 権限なしに file record の存在を漏らしてはいけない。
file record 取得は必ず case 権限確認後。

---

## 削除の失敗時ポリシー

削除には DynamoDB record 削除と S3 DeleteObject の 2 操作が必要。

```
1. S3 DeleteObject 実行
   失敗 → 500 を返す（DynamoDB record は保持）
   成功 →
2. DynamoDB CaseFile record 削除
   失敗 → 500 を返す（孤立 record が残る）
   成功 →
3. CaseHistory FILE_DELETED 記録
   失敗 → ログのみ（削除自体は完了とみなす。history は best-effort）
```

**S3 delete 成功後に DynamoDB delete が失敗した場合:**
S3 オブジェクトは消えているが DynamoDB に record が残る。
この孤立 record は download-url 発行時に S3 HeadObject で存在確認することで、
`NoSuchKey` → 404 として検出できる（または download-url 生成後 403 で失敗する）。
Task F の範囲では孤立 record の自動クリーンアップは行わない。

---

## API 設計（5本）

| Method | Path | Lambda | 権限 |
|---|---|---|---|
| GET | /cases/{id}/files | GetCaseFilesFunction | read |
| POST | /cases/{id}/files/upload-url | GetCaseFileUploadUrlFunction | creator/owner only |
| POST | /cases/{id}/files | ConfirmCaseFileUploadFunction | creator/owner only |
| GET | /cases/{id}/files/{fileId}/download-url | GetCaseFileDownloadUrlFunction | read |
| DELETE | /cases/{id}/files/{fileId} | DeleteCaseFileFunction | creator/owner only |

---

## IAM 設計

| Lambda | DynamoDB | S3 (caseImagesBucket) |
|---|---|---|
| GetCaseFiles | GetItem, Query | — |
| GetCaseFileUploadUrl | GetItem, Query | s3:PutObject |
| ConfirmCaseFileUpload | GetItem, Query, PutItem | s3:GetObject（HeadObject 用） |
| GetCaseFileDownloadUrl | GetItem, Query | s3:GetObject |
| DeleteCaseFile | GetItem, Query, DeleteItem, PutItem | s3:DeleteObject |

**CDK 変更サマリ:**
- 新規 S3 bucket: なし（既存 caseImagesBucket 再利用）
- DynamoDB GSI 追加: なし（既存 byCase GSI 再利用）
- 新規 Lambda: 5
- 新規 API Gateway route: 5
- Lambda IAM: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` を各 Lambda に追加
- **CDK deploy 必要**

---

## ファイル制限ポリシー

### 許可 contentType

```typescript
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
```

### 最大ファイルサイズ: 20MB (20 * 1024 * 1024 bytes)

### ファイル名ポリシー

- 表示用として DynamoDB の `fileName` に保存
- S3 key にファイル名は含めない（fileId のみ）
- ファイル名長さ: 255 文字以内を API で検証
- 同一ファイル名の重複: 許可（fileId が異なれば別 record）
- ダウンロード時: `ResponseContentDisposition: "attachment; filename=\"${fileName}\""` で元ファイル名を付与

### 画像 preview 判断

```typescript
const isImageFile = (contentType: string): boolean =>
  contentType.startsWith("image/");
```

拡張子ではなく `contentType` で判断する。

---

## History Actions 追加

`CaseHistoryAction`:
- `FILE_UPLOADED = "FILE_UPLOADED"`
- `FILE_DELETED = "FILE_DELETED"`

---

## @task/core 型定義

```typescript
export interface CaseFile {
  fileId: string;
  caseId: string;
  companyId: string;
  uploaderCompanyId: string;
  uploadedBy: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
  // objectKey は含めない（クライアントに渡さない）
}

export interface GetCaseFileUploadUrlInput {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface GetCaseFileUploadUrlOutput {
  url: string;
  fields: Record<string, string>;
  fileId: string;
  // objectKey は含めない
}

export interface ConfirmCaseFileUploadInput {
  fileId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}
```

---

## UI コンポーネント: CaseFileSection.tsx

```
[Files タブ] count = caseFiles.length

ロード中: spinner
エラー: ErrorAlert
空 state: "No files uploaded yet." + [Upload File] ボタン（creator/owner のみ）

一覧（ファイルごと）:
  - 画像: thumbnail preview (contentType.startsWith("image/"))
  - ファイルアイコン（画像以外）
  - ファイル名（truncate）
  - サイズ（KB/MB 表示）
  - アップロード日時 + アップロード者名（userMap から解決）
  - [Download] ボタン → download-url API → window.open(url, "_blank")
  - [Delete] ボタン（creator/owner のみ） → window.confirm → DELETE API → リスト更新

上部: [Upload File] ボタン（creator/owner のみ）
  click → hidden <input type="file"> trigger
  ファイル選択後:
    1. クライアント側で contentType / fileSize 事前検証
    2. POST upload-url → { url, fields, fileId } 取得
    3. FormData 組み立て → S3 直接 POST
    4. POST /files { fileId, fileName, contentType, fileSize } → confirm
    5. 成功 → ファイル一覧に追加（リフレッシュ）
    ローディング中: ボタン無効 + spinner
    エラー: inline エラーメッセージ
```

---

## i18n キー（en / ja / ko / zh）

```
"Files"
"Upload File"
"No files uploaded yet."
"Download"
"Delete File"
"Are you sure you want to delete this file?"
"Failed to upload file."
"Failed to load files."
"Failed to download file."
"Failed to delete file."
"File Uploaded"    ← CaseHistorySection の HISTORY_ACTION_KEY 用
"File Deleted"     ← CaseHistorySection の HISTORY_ACTION_KEY 用
```

---

## 実装順序

1. `@task/core` — `CaseFile`, `ConfirmCaseFileUploadInput`, `GetCaseFileUploadUrlInput/Output` 型, `CaseHistoryAction.FILE_UPLOADED / FILE_DELETED` 追加
2. `task-api` — `s3KeyService.ts`, `caseFileRecord.ts`, `caseFileRepository.ts`, 5 handlers
3. `task-infra` — 5 Lambda + Routes + IAM
4. `@task/core/CaseService.ts` — 5 API メソッド追加
5. `task-app` — `CaseFileSection.tsx`, page.tsx タブ追加, locales 4言語
6. `task-app` — `CaseHistorySection.tsx` に `FILE_UPLOADED / FILE_DELETED` key 追加
7. テスト — 各ハンドラ 4〜6 ケース（合計 25〜28 ケース想定）
