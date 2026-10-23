# CityFS MVP benchmarks

Measured 2026-10-23 on the Windows x64 development host with Node 24.18.0 and Google Chrome 155.0.8059.85. Codec numbers are averages of 15 iterations up to 1 KiB and 5 iterations above it, using fixed-seed incompressible data and compression disabled. Browser cadence was sampled for one second after a 500 ms warm-up in headed Chrome on the host's 120 Hz display.

| Original file | Buildings |   Encode |   Decode | Browser frame cadence |
| ------------: | --------: | -------: | -------: | --------------------: |
|         128 B |       223 |  0.42 ms |  0.74 ms |             120.9 fps |
|         1 KiB |     1,120 |  1.90 ms |  3.50 ms |             120.6 fps |
|         4 KiB |     4,192 |  6.46 ms | 13.09 ms |             120.5 fps |
|         8 KiB |     8,288 | 13.49 ms | 24.75 ms |             120.6 fps |

The building total includes the binary envelope; its exact overhead varies with UTF-8 filename and MIME-type length. Frame cadence is device-, browser-, viewport-, and power-policy-dependent, so these numbers demonstrate this host rather than promise a minimum. Reproduce the codec measurements with `npm run benchmark` and the viewport measurements with `npx playwright test tests/e2e/performance.spec.ts --headed`.
