# Freeze hashes

Contents of the SHA256SUMS file of each freeze. The only edit is anonymization: the name of the main study's code directory is replaced by `study-v1.0/` (marked lines); the file hashes themselves are unchanged. Because of that substitution, the sha256 of the original SHA256SUMS file (given for each freeze) is the hash of the unedited file, not of the text below.

**Enforcement:** the runner refuses to start any test-split run (exit 65, no output directory created) unless `--freeze freeze-vX.Y` names a freeze directory whose SHA256SUMS verifies with `shasum -a 256 -c` and lists the test dataset's canonical sha256; the v1.2 launch script additionally verifies freeze-v1.2 and freeze-v1.1 before any test call.

## v1.0 (frozen 2026-11-11, about 11:50)

sha256 of the original `freeze-v1.0/SHA256SUMS`: `eda963580b70000670ccc0ac1b674d573795f91304c587a45561e37e99c2c176`

```
55a6ff2f006133f59a06777799002255217135a992f89758bcee5ce51c4cbcab  EXPERIMENT_DESIGN.md
03c6f5a1ad674fc5e8350aa0cf05794a3000e94941f70d5aa51846dad0f4bed1  FREEZE-CHECKLIST.md
9a7df6f8ae01ad33b241ea1490e95e98b8dd88cf1051d34a70018b8b446c70b6  study-v1.0/observer/observe.py
4a17c1edfeee74d8d4f0b95ab5bc61b12d9f3be7bd47e792592347a9614544ff  study-v1.0/src/codex.mjs
c284be4e807dbb97ff27d10ccbef779431442fc0a1091227596075218695853c  study-v1.0/src/common.mjs
5b32d61e26cbf360efb9dd129bbcfc3a3913507e5f1f47a9ac2544d538776639  study-v1.0/src/gate.mjs
25027eaa7fd7b2f695ae10eacb5b49a2d45bb604eddd5c8e4b2fcbe49b43aed5  study-v1.0/src/generate.mjs
13353c27b83ab7699c9705906514fbacc832686a6ca3150ed567ae5e73399dfc  study-v1.0/src/mlx_bridge.py
b93ba4c73fc6d8507f420409abb4c2b555753137f01f91804eccc0b31c6cc219  study-v1.0/src/models.mjs
38454646135b5f84ea39e3c412149784b76257c277d8c65694a3cc9abf689478  study-v1.0/src/run.mjs
600c23155237eb3fb1c70e1046af549791f22c740e738bb1dc109100edc87846  study-v1.0/tests/test.mjs
213098fa591cb4d7fc907ae040a706b7b8d0a44669d0405fd5cba873bffd1de6  study-v1.0/run-lint-923-schema-v2.json
511659460d53d932258dbe788a6db9fa57e698a9a230a0c1866a644e974dee1d  study-v1.0/results/dataset-test-001/dataset.json
e2228b9d8baa04bf3b1281245f1ed99e5f5ddb07ee19d2e45f67527382704370  study-v1.0/results/dataset-test-001/META.json
# dataset canonical sha256: c6364b11f6de4e98fd160e137f5aa04441ccd721cd28f76474c7b9d41a1c3679
```

`freeze-v1.0/SHA256SUMS.meta`:

```
dataset-sha256 c6364b11f6de4e98fd160e137f5aa04441ccd721cd28f76474c7b9d41a1c3679
```

## v1.1 (frozen 2026-11-15 10:40)

sha256 of the original `v1.1/freeze-v1.1/SHA256SUMS`: `de2bf7f8397b530dbcb6b1dbce3e70d7b924d340e14f02fb9db6fcd57f4e7f05`

```
32327a4ba5c02a35cc1dda9b70f888a31783ab52033eeddc22c4f4f6e194069f  ADDENDUM-v1.1.md
2a932bfd7b130f0f9662d4a21dc7a00bc573dd01580549d0030531bd118f4001  freeze_v11.zsh
2591a224d51b5b3281f1cbf2ea9fb744ab90cc4678e4885b5c7842e472d300f9  start_test_v11.zsh
24c22ae2f2321b02ddab33e263b6ab73a2dc4f06db89eef132946906509e2f06  run-lint-923-v11.json
1a5a54449e947c4f5840c67fa874120141c8abd617d5941863348963fce76741  lint/lint-923-v11-001.txt
39fd1c84bac12b7a224ef000a2af7a987bbce553307be0732c0a043a6ce7efc8  tests/no_overlap.py
82955544edb0726b373584160aece3ddaee029dcfe641112b8ce0dd39344a23c  observer/observe_v11.py
9a7df6f8ae01ad33b241ea1490e95e98b8dd88cf1051d34a70018b8b446c70b6  ../study-v1.0/observer/observe.py
4a17c1edfeee74d8d4f0b95ab5bc61b12d9f3be7bd47e792592347a9614544ff  src/codex.mjs
c284be4e807dbb97ff27d10ccbef779431442fc0a1091227596075218695853c  src/common.mjs
889d56d9afefad67233af700963546d3787666e3f27c9bfacc1e17e74aa39c1a  src/gate.mjs
214c11e8a5f9f8bb911fb109f1546b9ad8212b5384ab5b2434e8e6f4865ec98c  src/generate.mjs
18c36deb70b7ff9ebbeaa04dea1a3ca3b88d4fad28a1406c4de702d44bbc6ee5  src/models.mjs
bbe3ea05ce21d32c44e2344be5636745c199b8fb64bb5b86fcb603a8a22e16b0  src/run.mjs
13353c27b83ab7699c9705906514fbacc832686a6ca3150ed567ae5e73399dfc  src/mlx_bridge.py
4bff0b323bb84c2d22bda93ade4c270244d65a9699cac405acff086321dc178a  results/dataset-f11-002/dataset.json
a7de3e520d290c35cdeda11f9bce74b003cad3f6536e73936e4085783ecac3a1  results/dataset-f11-002/META.json
# dataset canonical sha256: c128c5704826086e86f2fb0bef5310d98b39a2697537aca9ad52b95a0d37c255
```

Freeze record (from `FREEZE.txt`): frozen_at 2026-11-15 10:40:30 (local time); files 17; Ollama version 0.40.16.

## v1.2 (frozen 2026-11-16 13:03)

sha256 of the original `v1.2/freeze-v1.2/SHA256SUMS`: `5e68664b5fb39c868d5353dd3329a651ddd4649fb59b8fddf56f8ff79400849f`

```
57d44fe6525af8124226c11b778bf24c1fb4f459e617b7723371a3c9eddf005b  ADDENDUM-v1.2.md
f0b44575c4f6506f96aa794bc63d980d1ef82c0380a39e042d25da0c0472cb84  freeze_v12.zsh
4581135d7e82476593a507676cd0a898b4ec124b2fe04584fd1135166676962d  start_v12.zsh
6582bbe91bcc01faf61bb9043b1ecf20f961d2cd2336972d11c8b2b249a6040a  run-lint-923-v12.json
d351dd4209abd5ef004c2b7418b57290bfe9b318d943e540e27bb87cff05c041  lint/lint-923-v12-dev.txt
093361076912cb328f9f5df929bdd227416589817ffe15f1504334fee92f2e87  observer/observe_v12.py
e626b74fc37888147a72028183627c960060f4a50954b4a7301438bafa9c6ff3  observer/observe_v12d.py
82955544edb0726b373584160aece3ddaee029dcfe641112b8ce0dd39344a23c  observer/observe_v11.py
20b9a5296ffe8a3d2bc105314f0d5dd751a7828fd7e679f65d9137977aba9a82  tests/test_defense_prompts.mjs
d51f64ba5c90db4dcb3bb4b00308dedc832d29d5bc177c2dca90f109ca498b6f  tools/record_versions.py
b36347c58d4b4f92ef48c56033307395b777bdd3bdd677403921ba8d1b50c241  lint/lint-923-v12d-fake.txt
9a7df6f8ae01ad33b241ea1490e95e98b8dd88cf1051d34a70018b8b446c70b6  ../study-v1.0/observer/observe.py
4a17c1edfeee74d8d4f0b95ab5bc61b12d9f3be7bd47e792592347a9614544ff  src/codex.mjs
c284be4e807dbb97ff27d10ccbef779431442fc0a1091227596075218695853c  src/common.mjs
55d0348196e76913eeb4f03de93dd08a047e2a921cc8873deda3ffde819e5c56  src/gate.mjs
214c11e8a5f9f8bb911fb109f1546b9ad8212b5384ab5b2434e8e6f4865ec98c  src/generate.mjs
4271f99ae275d848e21e18d4920e87b4860b07136d74fa505821ae09a076d2ff  src/models.mjs
48375502122dedd77a4ccdc8e3dc4d7857cab32f7205d43759a1cb4c21c3e9a5  src/run.mjs
13353c27b83ab7699c9705906514fbacc832686a6ca3150ed567ae5e73399dfc  src/mlx_bridge.py
4bff0b323bb84c2d22bda93ade4c270244d65a9699cac405acff086321dc178a  results/dataset-f11-002/dataset.json
a7de3e520d290c35cdeda11f9bce74b003cad3f6536e73936e4085783ecac3a1  results/dataset-f11-002/META.json
# dataset canonical sha256: c128c5704826086e86f2fb0bef5310d98b39a2697537aca9ad52b95a0d37c255
```

Freeze record (from `FREEZE.txt`): frozen_at 2026-11-16 13:03:04 (local time); files 21; Ollama version 0.40.16.

## Study 4 (v1.3) freeze

SHA-256 of freeze-v1.3/SHA256SUMS: c28794217852d19b8be43b252468755a79aa7d42997a64734e5571817b88a4aa (frozen frozen_at, before any v1.3 test call). The test runner refuses to start unless this manifest verifies.
