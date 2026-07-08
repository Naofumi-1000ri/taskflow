#!/usr/bin/env node
/**
 * Seed the shared demo user with a clean set of sample projects/lists/tasks.
 *
 * Idempotent: removes any existing projects owned by the demo user before
 * recreating them, so re-running this script always produces the same result.
 *
 * Required env vars:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY   (JSON string for Firebase Admin SDK)
 *   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   - NEXT_PUBLIC_DEMO_EMAIL         (defaults to demo@1000ri.jp)
 *   - NEXT_PUBLIC_DEMO_PASSWORD      (must match the value exposed to the client)
 *
 * Recommended invocation (Node 20+):
 *   node --env-file-if-exists=.env.local ./scripts/seed-demo.mjs
 */

import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? 'demo@1000ri.jp';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
const DEMO_DISPLAY_NAME = 'デモユーザー';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!DEMO_PASSWORD) {
  console.error('NEXT_PUBLIC_DEMO_PASSWORD is required.');
  process.exit(1);
}
if (!PROJECT_ID) {
  console.error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.');
  process.exit(1);
}

const DEFAULT_LABELS = [
  { name: '高優先', color: '#ef4444' },
  { name: '中優先', color: '#f59e0b' },
  { name: '低優先', color: '#6b7280' },
  { name: 'バグ', color: '#dc2626' },
  { name: '機能', color: '#3b82f6' },
];

const DEFAULT_TAGS = [
  { name: '進行中', color: '#3b82f6' },
  { name: '指示待ち', color: '#f97316' },
  { name: '完了', color: '#22c55e' },
  { name: '確認中', color: '#ef4444' },
];

const PROJECT_SPECS = [
  {
    name: 'Webサイトリニューアル',
    description: 'コーポレートサイトの全面リニューアルプロジェクト',
    icon: '🌐',
    color: '#3b82f6',
    lists: [
      { name: 'ToDo', color: '#64748b' },
      { name: '進行中', color: '#3b82f6' },
      { name: 'レビュー', color: '#f59e0b' },
      { name: '完了', color: '#22c55e' },
    ],
    tasks: [
      { listIdx: 0, title: 'デザインカンプ作成', priority: 'high', daysFromNow: 3 },
      { listIdx: 0, title: 'ワイヤーフレーム確定', priority: 'medium', daysFromNow: 5 },
      { listIdx: 0, title: 'コンテンツ移行計画', priority: 'low', daysFromNow: 7 },
      { listIdx: 1, title: 'トップページ実装', priority: 'high', daysFromNow: 10 },
      { listIdx: 1, title: 'お問い合わせフォーム', priority: 'medium', daysFromNow: 12 },
      { listIdx: 2, title: 'SEO設定確認', priority: 'medium', daysFromNow: 14 },
      { listIdx: 3, title: '要件定義', priority: 'high', daysFromNow: -7, isCompleted: true },
    ],
  },
  {
    name: 'モバイルアプリv2',
    description: 'iOS/Android アプリの大型バージョンアップ',
    icon: '📱',
    color: '#8b5cf6',
    lists: [
      { name: 'バックログ', color: '#64748b' },
      { name: '今スプリント', color: '#3b82f6' },
      { name: 'QA', color: '#f59e0b' },
      { name: 'リリース済み', color: '#22c55e' },
    ],
    tasks: [
      { listIdx: 0, title: 'プッシュ通知設計', priority: 'medium', daysFromNow: 21 },
      { listIdx: 0, title: 'オフラインモード仕様', priority: 'low', daysFromNow: 28 },
      { listIdx: 1, title: 'ログイン画面リデザイン', priority: 'high', daysFromNow: 4 },
      { listIdx: 1, title: 'ダッシュボードAPI連携', priority: 'high', daysFromNow: 6 },
      { listIdx: 1, title: 'プロフィール編集機能', priority: 'medium', daysFromNow: 8 },
      { listIdx: 2, title: 'ログイン周りの回帰テスト', priority: 'medium', daysFromNow: 2 },
      { listIdx: 3, title: 'v1.9 hotfix', priority: 'high', daysFromNow: -3, isCompleted: true },
    ],
  },
  {
    name: '社内オペレーション改善',
    description: '営業・サポート部門の業務フロー見直し',
    icon: '⚙️',
    color: '#22c55e',
    lists: [
      { name: '提案中', color: '#64748b' },
      { name: '実施中', color: '#3b82f6' },
      { name: '効果測定', color: '#f59e0b' },
      { name: '完了', color: '#22c55e' },
    ],
    tasks: [
      { listIdx: 0, title: 'CRM 移行調査', priority: 'high', daysFromNow: 14 },
      { listIdx: 0, title: '問い合わせフォーム改善', priority: 'medium', daysFromNow: 9 },
      { listIdx: 1, title: '日次レポート自動化', priority: 'medium', daysFromNow: 5 },
      { listIdx: 1, title: '休暇申請の Slack 統合', priority: 'low', daysFromNow: 11 },
      { listIdx: 2, title: '新オンボーディング効果測定', priority: 'medium', daysFromNow: 7 },
      { listIdx: 3, title: '備品発注ワークフロー導入', priority: 'low', daysFromNow: -10, isCompleted: true },
    ],
  },
];

function initAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountKey)),
      projectId: PROJECT_ID,
    });
  }
  return initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
}

async function ensureDemoUser(auth) {
  try {
    const user = await auth.getUserByEmail(DEMO_EMAIL);
    await auth.updateUser(user.uid, {
      password: DEMO_PASSWORD,
      displayName: DEMO_DISPLAY_NAME,
    });
    console.log(`Demo user already exists (uid=${user.uid}); password & displayName synced.`);
    return user.uid;
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: DEMO_DISPLAY_NAME,
      emailVerified: true,
    });
    console.log(`Created demo user (uid=${created.uid}).`);
    return created.uid;
  }
}

async function ensureUserDoc(db, uid) {
  await db.collection('users').doc(uid).set(
    {
      displayName: DEMO_DISPLAY_NAME,
      email: DEMO_EMAIL,
      photoURL: null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function deleteDocAndSubcollections(docRef) {
  const subcollections = await docRef.listCollections();
  for (const sub of subcollections) {
    const docs = await sub.listDocuments();
    for (const child of docs) {
      await deleteDocAndSubcollections(child);
    }
  }
  await docRef.delete();
}

async function clearExistingDemoProjects(db, uid) {
  const snap = await db.collection('projects').where('ownerId', '==', uid).get();
  if (snap.empty) {
    console.log('No existing demo projects to clear.');
    return;
  }
  console.log(`Clearing ${snap.size} existing demo project(s)...`);
  for (const doc of snap.docs) {
    await deleteDocAndSubcollections(doc.ref);
  }
}

async function seedProject(db, uid, spec, projectOrder) {
  const projectRef = db.collection('projects').doc();
  await projectRef.set({
    name: spec.name,
    description: spec.description,
    icon: spec.icon,
    color: spec.color,
    ownerId: uid,
    memberIds: [uid],
    isArchived: false,
    order: projectOrder,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await projectRef.collection('members').doc(uid).set({
    userId: uid,
    role: 'admin',
    joinedAt: FieldValue.serverTimestamp(),
  });

  for (const label of DEFAULT_LABELS) {
    await projectRef.collection('labels').add({
      ...label,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  for (let i = 0; i < DEFAULT_TAGS.length; i++) {
    await projectRef.collection('tags').add({
      ...DEFAULT_TAGS[i],
      order: i,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const listIds = [];
  for (let i = 0; i < spec.lists.length; i++) {
    const listSpec = spec.lists[i];
    const listRef = await projectRef.collection('lists').add({
      projectId: projectRef.id,
      name: listSpec.name,
      color: listSpec.color,
      order: i,
      autoCompleteOnEnter: listSpec.name === '完了' || listSpec.name === 'リリース済み',
      autoUncompleteOnExit: false,
      autoSetStartDateOnEnter: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    listIds.push(listRef.id);
  }

  const now = Date.now();
  for (let i = 0; i < spec.tasks.length; i++) {
    const t = spec.tasks[i];
    const dueDate = new Date(now + t.daysFromNow * 86400000);
    const completedAt = t.isCompleted ? new Date(now + t.daysFromNow * 86400000) : null;
    await projectRef.collection('tasks').add({
      projectId: projectRef.id,
      listId: listIds[t.listIdx],
      title: t.title,
      description: '',
      order: i,
      assigneeIds: [uid],
      labelIds: [],
      tagIds: [],
      dependsOnTaskIds: [],
      priority: t.priority ?? null,
      startDate: null,
      dueDate,
      durationDays: null,
      isDueDateFixed: false,
      isCompleted: t.isCompleted ?? false,
      completedAt,
      isAbandoned: false,
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  console.log(
    `Seeded project "${spec.name}" — ${spec.lists.length} lists, ${spec.tasks.length} tasks.`
  );
}

async function main() {
  const app = initAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const uid = await ensureDemoUser(auth);
  await ensureUserDoc(db, uid);
  await clearExistingDemoProjects(db, uid);

  for (let i = 0; i < PROJECT_SPECS.length; i++) {
    await seedProject(db, uid, PROJECT_SPECS[i], i);
  }

  console.log('\nDemo seed completed successfully.');
  console.log(`  Demo email   : ${DEMO_EMAIL}`);
  console.log(`  Demo uid     : ${uid}`);
  console.log(`  Projects     : ${PROJECT_SPECS.length}`);
}

main().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
