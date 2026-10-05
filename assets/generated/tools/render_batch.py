"""Batch FLUX renderer for Aetheria Clicker assets, GPU-arbiter safe.

Usage: python render_batch.py jobs.json
jobs.json: [{"id": "...", "prompt": "...", "seed": 123, "width": 1024, "height": 1024, "steps": 20}, ...]

Flow: POST :8090/gpu/acquire (arbiter unloads LLM, starts ComfyUI via hub) -> submit every job to the
arbiter's ComfyUI front :8190 -> renew lease -> abort if watchdog STOP.json appears ->
POST /gpu/release with comfy_after=stop (ComfyUI freed + stopped). Raw PNGs go to ComfyUI/output/clicker/.
"""
import json, os, sys, time, urllib.request, uuid

ARB = "http://127.0.0.1:8090"
CF = "http://127.0.0.1:8190"
WF = r"C:\Users\BigB\.dsh\skills\comfy-image\workflows\flux_txt2img.json"
STOP = r"C:\Users\BigB\dev\gpu-arbiter\watchdog\state\STOP.json"
OUT = r"C:\Users\BigB\Documents\comfy\ComfyUI\output"


def http(method, url, body=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "null")


def by_title(wf, t):
    for k, v in wf.items():
        if v.get("_meta", {}).get("title") == t:
            return k, v
    return None, None


def log(m):
    print("[%s] %s" % (time.strftime("%H:%M:%S"), m), file=sys.stderr, flush=True)


def main():
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    base = json.load(open(WF, encoding="utf-8"))
    if os.path.exists(STOP):
        sys.exit("watchdog STOP.json present; refusing to start")
    st, j = http("POST", ARB + "/gpu/acquire", {"owner": "comfy", "client": "clicker-assets:%d" % os.getpid(),
                 "group": "comfy-image", "ttl": 900, "wait_s": 300, "start_comfy": True}, timeout=400)
    if st != 200 or not j.get("ok"):
        sys.exit("acquire failed: %s %s" % (st, j))
    lease = j["lease"]
    log("acquired lease %s (baseline %s MiB)" % (lease, (j.get("status") or {}).get("baseline_mib")))
    results, last_renew, aborted = {}, time.time(), False
    try:
        for job in jobs:
            wf = json.loads(json.dumps(base))
            by_title(wf, "Positive Prompt")[1]["inputs"]["text"] = job["prompt"]
            by_title(wf, "Sampler")[1]["inputs"].update(seed=job["seed"], steps=job.get("steps", 20),
                                                        sampler_name="euler", scheduler="simple")
            by_title(wf, "Guidance")[1]["inputs"]["guidance"] = job.get("guidance", 3.5)
            by_title(wf, "Latent")[1]["inputs"].update(width=job.get("width", 1024), height=job.get("height", 1024), batch_size=1)
            by_title(wf, "Save")[1]["inputs"]["filename_prefix"] = "clicker/" + job["id"]
            st, r = http("POST", CF + "/prompt", {"prompt": wf, "client_id": uuid.uuid4().hex})
            if st != 200 or "prompt_id" not in r:
                log("REJECTED %s: %s" % (job["id"], r)); continue
            pid, t0 = r["prompt_id"], time.time()
            while True:
                if os.path.exists(STOP):
                    log("STOP.json appeared - interrupting"); http("POST", CF + "/interrupt", {}); aborted = True; break
                if time.time() - last_renew > 60:
                    http("POST", ARB + "/gpu/renew", {"lease": lease, "ttl": 900}); last_renew = time.time()
                st, h = http("GET", CF + "/history/" + pid)
                if st == 200 and h and pid in h:
                    e = h[pid]
                    imgs = [os.path.join(OUT, i.get("subfolder", ""), i["filename"])
                            for o in e.get("outputs", {}).values() for i in o.get("images", [])]
                    results[job["id"]] = imgs
                    log("%s done in %.1fs -> %s (%s)" % (job["id"], time.time() - t0, imgs, e.get("status", {}).get("status_str")))
                    break
                if time.time() - t0 > 600:
                    log("timeout %s" % job["id"]); http("POST", CF + "/interrupt", {}); break
                time.sleep(1)
            if aborted:
                break
    finally:
        st, r = http("POST", ARB + "/gpu/release", {"lease": lease, "comfy_after": "stop", "prewarm": False}, timeout=400)
        log("release: %s %s" % (st, json.dumps(r)[:400]))
    print(json.dumps({"aborted": aborted, "results": results}))


if __name__ == "__main__":
    main()
