import {useEffect, useState} from 'react'
import {ArmyCollectionsApi, Configuration} from './generated'
import type {ArmyCollection} from './generated'

export default function CollectionsPage() {
    const [collections, setCollections] = useState<ArmyCollection[]>([])
    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState<string | null>(null)

    const api = new ArmyCollectionsApi(new Configuration({basePath: ''}))

    useEffect(() => {
        setLoading(true)
        api
            .getArmyCollections()
            .then((r) => setCollections(r.data))
            .catch((e) => setError(String(e)))
            .finally(() => setLoading(false))
    }, [api])

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        try {
            const created = (await api.createArmyCollection({name, description})).data
            setCollections((s) => [created, ...s])
            setName('')
            setDescription('')
            setShowForm(false)
        } catch (e) {
            setError(String(e))
        }
    }

    return (
        <div style={{padding: 24}}>
            <h1>Collections</h1>
            <p>Create and manage your miniature collections.</p>
            <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Create collection'}</button>
            {showForm && (
                <form onSubmit={handleCreate} style={{marginTop: 12}}>
                    <div>
                        <label>
                            Name<br/>
                            <input value={name} onChange={(e) => setName(e.target.value)} required/>
                        </label>
                    </div>
                    <div style={{marginTop: 8}}>
                        <label>
                            Description<br/>
                            <input value={description} onChange={(e) => setDescription(e.target.value)}/>
                        </label>
                    </div>
                    <div style={{marginTop: 8}}>
                        <button type="submit">Create</button>
                    </div>
                </form>
            )}

            {error && <div style={{color: 'red'}}>{error}</div>}

            <div style={{marginTop: 20}}>
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
    )
}
