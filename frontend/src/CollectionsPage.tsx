import type React from "react";
import { useEffect, useState } from "react";
import type { ArmyCollection } from "./generated";
import { ArmyCollectionsApi, Configuration } from "./generated";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<ArmyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const api = new ArmyCollectionsApi(new Configuration({ basePath: "" }));
    api
      .getArmyCollections({ signal: ac.signal })
      .then((r) => {
        if (!ac.signal.aborted) setCollections(r.data);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    const api = new ArmyCollectionsApi(new Configuration({ basePath: "" }));
    e.preventDefault();
    setError(null);
    try {
      const created = (await api.createArmyCollection({ name, description })).data;
      setCollections((s) => [created, ...s]);
      setName("");
      setDescription("");
      setShowForm(false);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Collections</h1>
      <p>Create and manage your miniature collections.</p>
      <button type={"button"} onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancel" : "Create collection"}
      </button>
      {showForm && (
        <form onSubmit={handleCreate} style={{ marginTop: 12 }}>
          <div>
            <label>
              Name
              <br />
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              Description
              <br />
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="submit">Create</button>
          </div>
        </form>
      )}

      {error && <div style={{ color: "red" }}>{error}</div>}

      <div style={{ marginTop: 20 }}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table border={1} cellPadding={6}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c) => (
                <tr key={c.id || c.name}>
                  <td>{c.name}</td>
                  <td>{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
