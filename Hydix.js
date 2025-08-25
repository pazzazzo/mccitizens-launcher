const { spawn } = require('child_process');
const portfinder = require("portfinder")
const crypto = require('crypto');
const http = require("http");
const open = require('open').default;

class Hydix {
    /**
     * 
     * @param {import("./SessionManager")} sessionManager 
     */
    constructor(sessionManager) {
        this.profile = null
        this.store = sessionManager.store
        this.sessionManager = sessionManager
    }
    async autoConnect() {
        let hydixToken = this.store.get("hydixToken")
        console.log(hydixToken);

        if (!hydixToken) {
            throw "no_token"
        } else {
            const url = `${process.env.HYDIX_ENDPOINT}/api/mccitizens/auth/refresh`;
            let res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${hydixToken}`,
                    'Accept': 'application/json'
                },
                method: "GET"
            }).catch((r) => {
                if (r instanceof TypeError && r.message === "fetch failed") {
                    throw "unresolvable"
                }
                throw r
            })
            if (res) {
                const r = await res.json()
                if (res.ok) {
                    this.profile = r
                    console.log(r);
                }
                return r
            } else {
                throw "no_response"
            }
        }
    }

    async connect() {
        const port = await portfinder.getPort({ startPort: 3000 })
        const redirect_uri = `http://127.0.0.1:${port}/callback`;
        const state = crypto.randomBytes(16).toString('hex');
        const pkce = this.makePkce();

        // Construire l'URL de synchro (supporte PKCE + loopback)
        const syncUrl = `${process.env.HYDIX_ENDPOINT}/api/mccitizens/auth/sync` +
            `?redirect_uri=${encodeURIComponent(redirect_uri)}` +
            `&state=${encodeURIComponent(state)}` +
            `&code_challenge=${encodeURIComponent(pkce.code_challenge)}` +
            `&code_challenge_method=${encodeURIComponent(pkce.method)}`;

        // Lance un petit serveur loopback qui attend le callback
        const token = await new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                const endOk = (msg) => { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(msg); };
                const endBad = (code, msg) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(msg); };

                if (req.method === 'GET' && req.url.startsWith('/callback')) {
                    try {
                        const u = new URL(req.url, `http://127.0.0.1:${port}`);
                        const gotState = u.searchParams.get('state');
                        if (gotState !== state) throw new Error('state invalide');

                        // 2 options possibles selon ton serveur :
                        // a) il renvoie ?access_token=...
                        const accessToken = u.searchParams.get('access_token');
                        if (accessToken) {
                            endOk('Synchronisation terminée. Vous pouvez fermer cette fenêtre.');
                            server.close();
                            return resolve(accessToken);
                        }

                        // b) il renvoie ?code=... -> on fait l’échange PKCE
                        const code = u.searchParams.get('code');
                        if (code) {
                            const tokenRes = await (await fetch(`${process.env.HYDIX_ENDPOINT}/api/mccitizens/auth/token`, {
                                method: "POST",
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    grant_type: 'authorization_code',
                                    code,
                                    code_verifier: pkce.code_verifier,
                                    msAuthToken: this.sessionManager.msAuthToken
                                })
                            })).json();
                            if (!tokenRes || !tokenRes.access_token) {
                                throw new Error(`Réponse /token invalide: ${JSON.stringify(tokenRes)}`);
                            }
                            endOk('Synchronisation terminée. Vous pouvez fermer cette fenêtre.');
                            server.close();
                            return resolve(tokenRes.access_token);
                        }

                        // c) JSON POST (optionnel, si ton serveur POSTe sur le callback)
                        endBad(400, 'Flux de redirection inattendu.');
                        server.close();
                        reject(new Error('Aucun access_token ni code reçu'));
                    } catch (e) {
                        endBad(400, 'Erreur de synchronisation.');
                        server.close();
                        reject(e);
                    }
                } else if (req.method === 'POST' && req.url === '/callback') {
                    // Optionnel: si ton serveur POST un JSON { state, access_token } ou { state, code }
                    let body = '';
                    req.on('data', (c) => (body += c));
                    req.on('end', async () => {
                        try {
                            const json = JSON.parse(body || '{}');
                            if (json.state !== state) throw new Error('state invalide');

                            if (json.access_token) {
                                endOk('Synchronisation terminée. Vous pouvez fermer cette fenêtre.');
                                server.close();
                                return resolve(json.access_token);
                            }
                            if (json.code) {
                                const tokenRes = await (await fetch(`${process.env.HYDIX_ENDPOINT}/api/mccitizens/auth/token`, {
                                    method: "POST",
                                    headers: {
                                        'Accept': 'application/json',
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        grant_type: 'authorization_code',
                                        code: json.code,
                                        code_verifier: pkce.code_verifier
                                    })
                                })).json();
                                if (!tokenRes || !tokenRes.access_token) throw new Error('Réponse /token invalide');
                                endOk('Synchronisation terminée. Vous pouvez fermer cette fenêtre.');
                                server.close();
                                return resolve(tokenRes.access_token);
                            }
                            throw new Error('Payload JSON inattendu');
                        } catch (e) {
                            endBad(400, 'Erreur JSON callback.');
                            server.close();
                            reject(e);
                        }
                    });
                } else {
                    res.writeHead(404).end();
                }
            });

            server.listen(port, '127.0.0.1');

            const t = setTimeout(() => {
                try { server.close(); } catch { /* empty */ }
                reject(new Error('Timeout de synchronisation'));
            }, 180000);

            // Ouvrir le navigateur une fois que le serveur écoute
            open(syncUrl);

            // Nettoyage du timer si jamais resolve/reject appelé
            const _resolve = resolve;
            const _reject = reject;
            resolve = (...a) => { clearTimeout(t); _resolve(...a); };
            reject = (...a) => { clearTimeout(t); _reject(...a); };
        });
        this.store.set("hydixToken", token)
        return await this.autoConnect();
    }

    makePkce() {
        const code_verifier = crypto.randomBytes(32).toString('base64url');
        const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
        return { code_verifier, code_challenge, method: 'S256' };
    }
}

module.exports = Hydix