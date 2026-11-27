Ini adalah catatan pribadi, bisa dibilang rangkuman dari single source of truth untuk final sprint
untuk pembuatan SRS, source of truth tetap ada di docs\last_sprint\resource\kebutuhan_sprint_4.md

PERIKSA DULU dari current state sama docs\last_sprint\resource\kebutuhan_sprint_4.md, diffnya apa aja. 
buat tabel 3 kolom:
kolom 1: yang sudah ada di codebase
kolom 2: yang ada di codebase, tapi belum ada di docs\last_sprint\resource\kebutuhan_sprint_4.md
kolom 3: yang ada di docs\last_sprint\resource\kebutuhan_sprint_4.md belum ada di codebase

Setelah cek source, sebelum buat realisasi periksa apakah implementasi yang disebutkan

- role aslab ini sudah ditambahkan, namun lihat notes selanjutnya.
- dan fitur yang ada di asprak dipindah ke aslab. asprak HANYA DISISAKAN buka sesi tutup sesi dan kelola izin Saja.
selain asprak, di future, jika ada fitur manajemen tambahan lain, nanti langsung masukin aja ke ASLAB bukan ASPRAK

---

sprint utama terakhir: docs\last_sprint\resource\kebutuhan_sprint_4.md
"implementasi midtrans sandbox"
"implementasi analisis sentimen model lokal"

model sentimen untuk analisa kalimat "postif" "negatif" "neutral" dari alasan text dari izin praktikan

model nya kecil hanya tf idf biasa

refer to point 2 susah diimplementasiiin bagian bulk
harus buat template, dan ux bakal susah,. pake excel(?)

buatin outputnya:
1. srs rangkuman, yang jadi reference untuk realisasi semuanya di "docs\last_sprint\output_source\srs.md"
2. pembagian job untuk masing masing programmer (Daniel Yuda Zufar)
3. Branching: feat, fix, chore,


output untuk form: Nama Programmer - SRS kode : user story