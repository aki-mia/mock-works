import { useEffect, useState, ChangeEvent, FormEvent } from 'react';

interface Route {
  method: string;
  path: string;
  response_template: string;
  auth: boolean;
  delay?: number;
}

const emptyRoute: Route = {
  method: 'GET',
  path: '/new-path',
  response_template: 'new_response.json',
  auth: false,
  delay: 0,
};

export default function Home() {
  const [edited, setEdited] = useState<Route[]>([]);

  useEffect(() => {
    fetch('/api/routes')
      .then(res => res.json())
      .then((data: Route[]) => setEdited(data))
      .catch(console.error);
  }, []);

  const handleChange = (
    index: number,
    key: keyof Route,
    value: string | boolean | number
  ) => {
    const updated = [...edited];
    updated[index] = { ...updated[index], [key]: value } as Route;
    setEdited(updated);
  };

  const handleAdd = () => setEdited([...edited, { ...emptyRoute }]);
  const handleDelete = (index: number) => setEdited(edited.filter((_, i) => i !== index));

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edited),
    })
      .then(() => alert('Routes saved!'))
      .catch(console.error);
  };

  return (
    <>
      {/* Drawer Navigation */}
      <nav className="left drawer">
        <a href="#">
          <i>home</i>
          <div>Home</div>
        </a>
        <a href="#">
          <i>search</i>
          <div>Search</div>
        </a>
        <a href="#">
          <i>share</i>
          <div>Share</div>
        </a>
      </nav>

      {/* Main Content */}
      <main className="responsive">
        <h1 className="title">Mock API Route Editor</h1>
        <button className="small-round" onClick={handleAdd}>+ Add Route</button>

        <form onSubmit={handleSave}>
          {edited.map((r, i) => (
            <article className="card" key={i}>
              <h2 className="subtitle">Route #{i + 1}</h2>
              <button className="small-round error" type="button" onClick={() => handleDelete(i)}>
                Delete
              </button>

              <label>
                Method:
                <input
                  type="text"
                  value={r.method}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, 'method', e.target.value)}
                />
              </label>

              <label>
                Path:
                <input
                  type="text"
                  value={r.path}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, 'path', e.target.value)}
                />
              </label>

              <label>
                Template:
                <input
                  type="text"
                  value={r.response_template}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, 'response_template', e.target.value)}
                />
              </label>

              <details>
                <summary>Options</summary>
                <label>
                  <input
                    type="checkbox"
                    checked={r.auth}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, 'auth', e.target.checked)}
                  /> Auth
                </label>
                <label>
                  Delay (ms):
                  <input
                    type="number"
                    value={r.delay || 0}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, 'delay', parseInt(e.target.value, 10) || 0)}
                  />
                </label>
              </details>
            </article>
          ))}

          <button className="small-round success" type="submit">Save All</button>
        </form>

        <nav>
          <a target="_blank" href="http://localhost:8080/swagger/">👉 View Swagger UI</a>
        </nav>
      </main>
    </>
  );
}