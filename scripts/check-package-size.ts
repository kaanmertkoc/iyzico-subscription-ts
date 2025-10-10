#!/usr/bin/env bun
/**
 * Package Size Checker
 * 
 * This script checks the size of your npm package before publishing.
 * It creates a tarball (like npm pack), measures both compressed and uncompressed sizes,
 * and optionally saves the results to a tracking file.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';

interface SizeEntry {
  version: string;
  date: string;
  zipped: number;
  unzipped: number;
  zippedFormatted: string;
  unzippedFormatted: string;
  files: number;
}

interface SizeHistory {
  entries: SizeEntry[];
}

const TRACKING_FILE = join(process.cwd(), '.package-size-history.json');
const TEMP_DIR = join(process.cwd(), '.package-size-temp');

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  return packageJson.version;
}

function cleanupTempFiles() {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

function getDirectorySize(dirPath: string): number {
  const { readdirSync, statSync } = require('fs');
  const { join } = require('path');
  
  let totalSize = 0;
  
  function calculateSize(path: string) {
    const stat = statSync(path);
    
    if (stat.isFile()) {
      totalSize += stat.size;
    } else if (stat.isDirectory()) {
      const files = readdirSync(path);
      for (const file of files) {
        calculateSize(join(path, file));
      }
    }
  }
  
  calculateSize(dirPath);
  return totalSize;
}

function checkPackageSize(): SizeEntry {
  console.log('📦 Building package...\n');
  
  // Ensure package is built
  try {
    execSync('bun run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed. Please fix build errors first.');
    process.exit(1);
  }

  console.log('\n📏 Measuring package size...\n');
  
  // Clean up any previous temp files
  cleanupTempFiles();
  
  try {
    // Create tarball
    const packOutput = execSync('npm pack --dry-run 2>&1', { encoding: 'utf-8' });
    
    // Parse npm pack output to get file count
    const fileMatches = packOutput.match(/total files:\s*(\d+)/);
    const fileCount = fileMatches ? parseInt(fileMatches[1]) : 0;
    
    // Create actual tarball to measure size
    const packResult = execSync('npm pack', { encoding: 'utf-8' }).trim();
    const tarballName = packResult.split('\n').pop() || '';
    
    if (!tarballName || !existsSync(tarballName)) {
      throw new Error('Failed to create tarball');
    }
    
    // Get compressed size (cross-platform)
    const { size: zippedSize } = statSync(tarballName);
    
    // Extract tarball to measure uncompressed size
    mkdirSync(TEMP_DIR, { recursive: true });
    execSync(`tar -xzf ${tarballName} -C ${TEMP_DIR}`);
    
    // Get uncompressed size (cross-platform)
    const unzippedSize = getDirectorySize(TEMP_DIR);
    
    // Clean up tarball
    rmSync(tarballName);
    
    const version = getPackageVersion();
    const entry: SizeEntry = {
      version,
      date: new Date().toISOString(),
      zipped: zippedSize,
      unzipped: unzippedSize,
      zippedFormatted: formatBytes(zippedSize),
      unzippedFormatted: formatBytes(unzippedSize),
      files: fileCount
    };
    
    return entry;
  } finally {
    cleanupTempFiles();
  }
}

function loadHistory(): SizeHistory {
  if (!existsSync(TRACKING_FILE)) {
    return { entries: [] };
  }
  return JSON.parse(readFileSync(TRACKING_FILE, 'utf-8'));
}

function saveHistory(history: SizeHistory) {
  writeFileSync(TRACKING_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

function displayResults(current: SizeEntry, previous?: SizeEntry) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Package Size Report - v${current.version}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📁 Files:      ${current.files}`);
  console.log(`📦 Zipped:     ${current.zippedFormatted} (${current.zipped.toLocaleString()} bytes)`);
  console.log(`📂 Unzipped:   ${current.unzippedFormatted} (${current.unzipped.toLocaleString()} bytes)`);
  
  if (previous) {
    const zippedDiff = current.zipped - previous.zipped;
    const unzippedDiff = current.unzipped - previous.unzipped;
    const zippedPercent = ((zippedDiff / previous.zipped) * 100).toFixed(2);
    const unzippedPercent = ((unzippedDiff / previous.unzipped) * 100).toFixed(2);
    
    const zippedSign = zippedDiff >= 0 ? '+' : '-';
    const unzippedSign = unzippedDiff >= 0 ? '+' : '-';
    
    console.log('\n📈 Comparison with v' + previous.version + ':');
    console.log(`   Zipped:     ${zippedSign}${formatBytes(Math.abs(zippedDiff))} (${zippedPercent}%)`);
    console.log(`   Unzipped:   ${unzippedSign}${formatBytes(Math.abs(unzippedDiff))} (${unzippedPercent}%)`);
    
    if (zippedDiff > 0) {
      console.log('\n⚠️  Package size increased');
    } else if (zippedDiff < 0) {
      console.log('\n✅ Package size decreased');
    } else {
      console.log('\n➡️  Package size unchanged');
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function displayHistory(history: SizeHistory) {
  if (history.entries.length === 0) {
    console.log('📜 No history available yet.\n');
    return;
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📜 Package Size History');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Display in reverse chronological order (newest first)
  const sorted = [...history.entries].reverse();
  
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const date = new Date(entry.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log(`v${entry.version} - ${date}`);
    console.log(`  📦 Zipped:   ${entry.zippedFormatted}`);
    console.log(`  📂 Unzipped: ${entry.unzippedFormatted}`);
    console.log(`  📁 Files:    ${entry.files}`);
    
    // Show diff with previous version
    if (i < sorted.length - 1) {
      const prev = sorted[i + 1];
      const diff = entry.zipped - prev.zipped;
      const percent = ((diff / prev.zipped) * 100).toFixed(2);
      const symbol = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
      const sign = diff >= 0 ? '+' : '-';
      console.log(`  ${symbol} ${sign}${formatBytes(Math.abs(diff))} (${percent}%) vs v${prev.version}`);
    }
    
    if (i < sorted.length - 1) {
      console.log('');
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (command === 'history') {
  const history = loadHistory();
  displayHistory(history);
} else if (command === 'track' || command === 'save') {
  const current = checkPackageSize();
  const history = loadHistory();
  
  // Check if this version already exists
  const existingIndex = history.entries.findIndex(e => e.version === current.version);
  const previous = history.entries[history.entries.length - 1];
  
  if (existingIndex >= 0) {
    // Update existing entry
    history.entries[existingIndex] = current;
    console.log(`✅ Updated size tracking for v${current.version}\n`);
  } else {
    // Add new entry
    history.entries.push(current);
    console.log(`✅ Saved size tracking for v${current.version}\n`);
  }
  
  saveHistory(history);
  displayResults(current, previous);
} else {
  // Default: just check and display (don't save)
  const current = checkPackageSize();
  const history = loadHistory();
  const previous = history.entries[history.entries.length - 1];
  
  displayResults(current, previous);
  
  console.log('💡 Tip: Run "bun run size:track" to save this to history\n');
}
