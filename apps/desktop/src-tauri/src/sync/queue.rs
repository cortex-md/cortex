use std::cmp::Ordering;
use std::collections::BinaryHeap;

#[derive(Debug, Clone)]
pub enum SyncOp {
    Upload { path: String },
    Download { path: String, version: u64 },
    Delete { path: String },
    Rename { old_path: String, new_path: String },
    ResolveConflict { path: String },
    InitialSync,
}

#[derive(Debug, Clone)]
pub struct QueueItem {
    pub priority: u32,
    pub op: SyncOp,
}

impl PartialEq for QueueItem {
    fn eq(&self, other: &Self) -> bool {
        self.priority == other.priority
    }
}

impl Eq for QueueItem {}

impl PartialOrd for QueueItem {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for QueueItem {
    fn cmp(&self, other: &Self) -> Ordering {
        self.priority.cmp(&other.priority)
    }
}

pub struct SyncQueue {
    heap: BinaryHeap<QueueItem>,
}

impl SyncQueue {
    pub fn new() -> Self {
        Self {
            heap: BinaryHeap::new(),
        }
    }

    pub fn push(&mut self, op: SyncOp, priority: u32) {
        self.heap.push(QueueItem { priority, op });
    }

    pub fn pop(&mut self) -> Option<QueueItem> {
        self.heap.pop()
    }

    pub fn is_empty(&self) -> bool {
        self.heap.is_empty()
    }

    pub fn len(&self) -> usize {
        self.heap.len()
    }

    pub fn upload(path: String) -> (SyncOp, u32) {
        (SyncOp::Upload { path }, 60)
    }

    pub fn download(path: String, version: u64) -> (SyncOp, u32) {
        (SyncOp::Download { path, version }, 80)
    }

    pub fn conflict(path: String) -> (SyncOp, u32) {
        (SyncOp::ResolveConflict { path }, 100)
    }

    pub fn initial_sync() -> (SyncOp, u32) {
        (SyncOp::InitialSync, 20)
    }
}
