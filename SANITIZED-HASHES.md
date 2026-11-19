# Sanitized files

For anonymity, the local home-directory path in the following 27 data files was replaced by `/Users/admin`
(byte-for-byte replacement of one path prefix; no other change). Their SHA-256 therefore differs from the frozen originals.
No freeze manifest (`*/SHA256SUMS`) covers these files, and no number in the paper depends on the path; the only
visible effect is in LaTeX comment lines of `expected/*.tex`, which record the original source hashes.

| File | Original SHA-256 | Published SHA-256 |
|---|---|---|
| `study-v1.0/results/observer-dev-003/observer.json` | `f806efe1e42eacd580e0c662218b1c25f6c13ee65edea1d77e26b636ae5c55a0` | `608f9201eee5ebddb8ddbbad1c1b7b2d0c4715db94ed659aef45b69194b4a8d3` |
| `study-v1.0/results/observer-test-001/observer.json` | `51b13aac70eda0a9b86ff39d6dcb473f3fde9c12c802e0d4e6ead9ac27f6c51d` | `e920d7d4c566525437d0e34c6dc8780c99d0f2e30ec31cf535ac515b371cd5ff` |
| `study-v1.0/results/secondary-test-001/secondary.json` | `f563acecee6f323954e4e27b48a89387e75c80c84ebd97e11b52170022f4b4dd` | `9ca077938c39e9273bafa4f8a849104649c4c3fbb8c9df77c0fb9986a2b7594b` |
| `study-v1.0/results/test-mlx_Qwen3.5-4B-001/config.json` | `0519ccc9d23043d5ebf8c512ffe84d46bdfcdacfdb642794807d5fa1e84f856e` | `b31366897a2328f99fe40380ccaa969476cda1220a74958bb4649239f99b77b1` |
| `v1.1/results/observer-test-001/observer.json` | `e0f9b3bd00bf68e5682110eb6f1fb480165f996d642183122df32da283beaf7a` | `9c25d26b41de7052c16d9ac1911ac3679f3a5805634d20c7b48e393b8e1e5176` |
| `v1.1/results/test-mlx_Qwen3.5-4B-001/config.json` | `fe0ffd82a366c285871fe7e92c8bae24ef9ce7e03a011b935652d3cc78d27ca5` | `c472b36a561967943c8472a1a25f8ab9303d19a68dd49118c9d20c5a3c210593` |
| `v1.2/results/observer-defense-gptoss-001/observer.json` | `7c29f3f699dd3c4767bb52aa1b68f65dd0cb38110f2f07838ff598f42b94b591` | `ed2ffb5919deabad29185121e40ced88f2f02a3a6547b5c3b734530890935683` |
| `v1.2/results/observer-defense-mlx_Qwen3.5-4B-001/observer.json` | `b389e94dd209cf571c7147dd4232f75e9b220293cecac2a9c759d1d09ce5568b` | `b42a66d6b02f4f6db72597a7670012ca55228510cbbc7c48a7b4c573a2a39e18` |
| `v1.2/results/observer-defense-ollama_gemma4-12b-it-q4_K_M-nothink-001/observer.json` | `78a197f48ce10038f3e3fd1611335c4296a5d03135f3e84e03197adf1f080ffe` | `b546578b4f76e828f5f7565d38283ac626c03262e0465155be942614093f60c0` |
| `v1.2/results/observer-defense-ollama_qwen3-8b-nothink-001/observer.json` | `32d2f1209e9522a50ff4be96dd9233376e1ec67c4cbf4e86558325543de1bc88` | `e776285d0fa9555b620be8bb2bc3ce786f6ad40cd1c31f35508841e63191aa8c` |
| `v1.2/results/observer-defense-ollama_qwen3.6-27b-coding-mtp-q4_K_M-nothink-001/observer.json` | `7bde112a79a4d643658510bdaf0aca63fa4a7eff25d89719f7f6cb73eabb8b87` | `f908e774b34f893b53aad77866d1a3076597d70a6a7ee72b06f244797abf864b` |
| `v1.2/results/test-defense-mlx_Qwen3.5-4B-001/config.json` | `40892448dc2dec3ecdf5f66d2c1b349024f3751f92d4a0a2ef2281f0cfc8e3ac` | `f78a08745ae1f8a182f05e6b55500c2531f2efbcfefd913486e4d28ad1e89535` |
| `v1.2/results/test-drift-mlx_Qwen3.5-4B-001/config.json` | `8616a20179f7e4e70976f06e25ea53afe0645ca35dbd4df04658683fc0ba4d68` | `4930587deff02efe4978961507a76b505fa68ac80d5d8996c3ae0ff140dffcf9` |
| `v1.2/results/versions-gptoss.json` | `037c4add9f7afc5ddbf1bf5a93246d7da5c71f81ec2f5cb8de63f562c0430eeb` | `13e3db928e1e144548f7405fdf809b25a2319104a54a6df61c7f6feafaf55c56` |
| `v1.2/results/versions-mlx_Qwen3.5-4B.json` | `f64bf678b115b6fd9005f60240a7c286b7cbcd7722733bb2e47c7e15797ddc6b` | `d05bfec36355b3a137a24e061b51f2f1289ab33667d07d027fe68c77552c41ef` |
| `v1.2/results/versions-ollama_gemma4-12b-it-q4_K_M-nothink.json` | `8884e09da3754759aa8b12c805c4890a353e0f8dcacfcbec9c9dcb33d82b5bc0` | `512dfe30bc018a3ba1b4f03617f45a26d889bf9f1df4b47709185ca2a83c2542` |
| `v1.2/results/versions-ollama_qwen3-8b-nothink.json` | `7c632c37a3ad5821e38809d46a4ec2d2f65f66261bb5463f477318e0b7e5d4cc` | `af724921c88af9060d64bed30370c06b414a2b7e1c08f3d9e79ecdc731ae4780` |
| `v1.2/results/versions-ollama_qwen3.6-27b-coding-mtp-q4_K_M-nothink.json` | `82e47d1058350de7616d7645390ca24a342e2f1ce48ed5f08636e445d9d38e26` | `8403ca76db339f4109802039d50d3477f41853e11231bfaaf6f42b379af10b80` |
| `v1.3/results/observer-test-gptoss-001/observer.json` | `7938bc5e507354fa8eaee9405019f1f7dc389b89208b1994947f70396bb3d16d` | `50aafcc4e397767f05ea3ae039988381ce7f34257222f499211bdda19661c8a5` |
| `v1.3/results/observer-test-mlx_Qwen3.5-4B-001/observer.json` | `ef16699d6c39b727117e593f5fd523ca98f29b9d0503ff46e3df655f173371f6` | `6d7db60b4a713b2e4e787808298512d39579acd9e081a59719bb0b63d07e6f5d` |
| `v1.3/results/observer-test-ollama_gemma4-12b-it-q4_K_M-nothink-001/observer.json` | `91d71920db95c7abd9099712b23ff371c875ca54765ce4bf032450ffd47c2c7e` | `b70732375e60f10c6f159c6e7f03b0695692526b2008f67ce6741b9b9f5aed03` |
| `v1.3/results/observer-test-ollama_qwen3-8b-nothink-001/observer.json` | `e0e21c7a58d5f1f4a639206df479f48a9515a240d556bbc91dbf30c025b08fc0` | `308ff0dad84e846c090a915810fb6283e36354e56860d3dccc3672ce699f6f3e` |
| `v1.3/results/test-mlx_Qwen3.5-4B-001/config.json` | `38d5fd97f50dc2df16f1ddce0dd073a870a3eff9d8fe448d4209dcd5d2455ced` | `c2b1cffdd1f495925f823163982e7c994d177be95ca7c3ed27b412bd06a71020` |
| `v1.3/results/versions-test-gptoss.json` | `d5af9cb2ccaaa3d3430c5a43de71c8820287ddd056bc69e02ac7de04f3a0e56a` | `c82370c33cf371cb1a5a9a369a2bb4edfaa86289ac12946ed82e8ad70c10f44e` |
| `v1.3/results/versions-test-mlx_Qwen3.5-4B.json` | `bcf8e0a18834993f2728c06aa75b503932b19af2d90860957251c5ca87420463` | `e5c9fff6001cb8645aa1be4be5ec78b8468033b0c380c6290d631e9277364702` |
| `v1.3/results/versions-test-ollama_gemma4-12b-it-q4_K_M-nothink.json` | `fc9aec015667a0f9974b328fddc3abafd57e819a04f0f9b35aa22ce85ae78fe2` | `00a58c438a4eb94bf09c9ec8890ed86bd7a6178b551787397a0be3a2cde8d264` |
| `v1.3/results/versions-test-ollama_qwen3-8b-nothink.json` | `d51f83b0e317c0438242f5667285a9941db8df53038265c2d0aecb048dce92ec` | `2ecadbe5b3f562d3bffb3949419bb4c19a6f39f3529a174f1c2b496809df3f00` |
