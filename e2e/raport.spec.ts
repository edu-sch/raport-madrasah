import { test, expect } from '@playwright/test';

test.describe('E2E Raport Madrasah Diniah Clone', () => {
  test.beforeEach(async ({ page }) => {
    // Fail immediately on unhandled console errors or server 5xx
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        throw new Error(`Browser console error: ${msg.text()}`);
      }
    });
    page.on('response', (res) => {
      if (res.status() >= 500) {
        throw new Error(`HTTP ${res.status()} on ${res.url()}`);
      }
    });
  });

  // --------------------------------------------------------------------------
  // F01: Autentikasi & Role Scoping
  // --------------------------------------------------------------------------
  test('F01-H1: Wali Kelas Login & Scoped View', async ({ page }) => {
    await page.goto('/clone/index.html');
    await expect(page.getByText('DARUL BAROKAH')).toBeVisible();
    await expect(page.getByText('Wali Kelas 5 A')).toBeVisible();
    // Verify only Class 5 students are displayed
    await expect(page.getByText('ABDULLAH AHMAD')).toBeVisible();
    await expect(page.getByText('FATIMAH AZ-ZAHRA')).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // F02: Data Siswa & Pengaturan Rombel A/B
  // --------------------------------------------------------------------------
  test('F02-H1: Ubah Rombel Siswa A/B & Batch Save', async ({ page }) => {
    await page.goto('/clone/index.html');
    await page.getByRole('button', { name: /Data Siswa & Rombel/i }).click();
    await expect(page.getByRole('heading', { name: /Daftar Santri & Pengaturan Rombel/i })).toBeVisible();

    // Select Rombel B for first student
    const radioB = page.locator('input[name="rombel_s-101"][value="B"]');
    await radioB.check();

    // Verify dirty button is active and displays count
    const saveBtn = page.getByRole('button', { name: /Simpan Rombel/i });
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).toContainText('1 Diubah');

    // Click Save
    await saveBtn.click();
    await expect(page.getByText(/Berhasil memperbarui rombel/i)).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // F03: Input Nilai & Kalkulasi Predikat Dinamis
  // --------------------------------------------------------------------------
  test('F03-H1: Input Nilai per Mapel & Live Predicate', async ({ page }) => {
    await page.goto('/clone/index.html');
    await page.getByRole('button', { name: /Input Nilai Mapel/i }).click();
    await expect(page.getByRole('heading', { name: /Input Nilai Siswa/i })).toBeVisible();

    // Test input score 95 for first student
    const scoreInput = page.locator('#input-nilai-s-101');
    await scoreInput.fill('95');

    // Check predicate updates to A
    const predicateBadge = page.locator('#predikat-s-101');
    await expect(predicateBadge).toHaveText('A');

    // Save batch
    await page.getByRole('button', { name: /Simpan Semua Nilai/i }).click();
    await expect(page.getByText(/Berhasil menyimpan nilai/i)).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // F04: Pratinjau & Cetak Lembar Raport A4
  // --------------------------------------------------------------------------
  test('F04-H1: Cetak Raport Resmi A4', async ({ page }) => {
    await page.goto('/clone/index.html');
    await page.getByRole('button', { name: /Cetak Raport Resmi/i }).click();

    // Check Kop Madrasah and metadata
    await expect(page.getByText('مدرسة دار البركة الدينية السلفية')).toBeVisible();
    await expect(page.getByText(/LAPORAN HASIL PENILAIAN SANTRI/i)).toBeVisible();
    await expect(page.getByText('ABDULLAH AHMAD')).toBeVisible();

    // Verify table has subject grades and averages
    await expect(page.getByText(/Nilai Rata-Rata/i)).toBeVisible();
    await expect(page.getByText('H. AHMAD DAHLAN, S.Pd.I')).toBeVisible();
  });
});
