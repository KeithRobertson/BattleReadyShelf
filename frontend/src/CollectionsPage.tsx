import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type React from "react";
import { Fragment, useEffect, useState } from "react";
import { useAuth } from "./auth/useAuth";
import type { ArmyCollection, CollectionModel, ModelDefinition } from "./generated";
import {
  createArmyCollection,
  createCollectionModel,
  getArmyCollections,
  getCollectionModels,
  getModelDefinitions,
} from "./generated";

function CollectionModelsPanel({ armyCollectionId }: { armyCollectionId: string }) {
  const [modelDefinitions, setModelDefinitions] = useState<ModelDefinition[]>([]);
  const [models, setModels] = useState<CollectionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelDefinitionId, setModelDefinitionId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    Promise.all([
      getModelDefinitions({ signal: ac.signal }),
      getCollectionModels({ path: { armyCollectionId }, signal: ac.signal }),
    ])
      .then(([modelDefinitionsRes, modelsRes]) => {
        if (ac.signal.aborted) return;
        setModelDefinitions(modelDefinitionsRes.data ?? []);
        setModels(modelsRes.data ?? []);
        if ((modelDefinitionsRes.data?.length ?? 0) > 0) {
          setModelDefinitionId(modelDefinitionsRes.data?.[0]?.id ?? "");
        }
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [armyCollectionId]);

  async function handleAddModel(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = (
        await createCollectionModel({
          path: { armyCollectionId },
          body: { modelDefinitionId, name: name || undefined, description: description || undefined },
        })
      ).data;
      if (!created) {
        throw new Error("Failed to add model");
      }
      setModels((s) => [created, ...s]);
      setName("");
      setDescription("");
    } catch (e) {
      setError(String(e));
    }
  }

  if (loading) return <CircularProgress size={24} sx={{ my: 2 }} />;

  return (
    <Box sx={{ p: 2, bgcolor: "action.hover" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {modelDefinitions.length === 0 ? (
        <Alert severity="warning">No model types are defined yet.</Alert>
      ) : (
        <Box component="form" onSubmit={handleAddModel} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              select
              label="Model type"
              value={modelDefinitionId}
              onChange={(e) => setModelDefinitionId(e.target.value)}
              required
              sx={{ minWidth: 160 }}
            >
              {modelDefinitions.map((md) => (
                <MenuItem key={md.id} value={md.id}>
                  {md.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ minWidth: 240 }}
            />
            <Button type="submit" variant="contained">
              Add model
            </Button>
          </Stack>
        </Box>
      )}

      {models.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No models added to this collection yet.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {models.map((m) => (
            <Stack key={m.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip label={m.modelDefinition?.name ?? "Unknown type"} size="small" />
              <Typography variant="body2">{m.name || <em>Unnamed</em>}</Typography>
              {m.description && (
                <Typography variant="body2" color="text.secondary">
                  &mdash; {m.description}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function CollectionsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [collections, setCollections] = useState<ArmyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setCollections([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    getArmyCollections({ signal: ac.signal })
      .then((r) => {
        if (!ac.signal.aborted && r.data) setCollections(r.data);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [isAuthenticated]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = (await createArmyCollection({ body: { name, description } })).data;
      if (!created) {
        throw new Error("Failed to create collection");
      }
      setCollections((s) => [created, ...s]);
      setName("");
      setDescription("");
      setShowForm(false);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Collections
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Create and manage your miniature collections.
      </Typography>

      {isAuthLoading ? (
        <CircularProgress />
      ) : !isAuthenticated ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Sign in with Google (top right) to view and manage your collections.
        </Alert>
      ) : (
        <>
          <Button variant="contained" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Create collection"}
          </Button>
          {showForm && (
            <Box component="form" onSubmit={handleCreate} sx={{ mt: 2 }}>
              <Stack spacing={2} sx={{ maxWidth: 400 }}>
                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  fullWidth
                />
                <Box>
                  <Button type="submit" variant="contained" color="primary">
                    Create
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            {loading ? (
              <CircularProgress />
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Name</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {collections.map((c) => (
                      <Fragment key={c.id || c.name}>
                        <TableRow>
                          <TableCell sx={{ width: 48 }}>
                            {c.id && (
                              <IconButton
                                size="small"
                                onClick={() => setExpandedId((id) => (id === c.id ? null : (c.id ?? null)))}
                              >
                                {expandedId === c.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.description}</TableCell>
                        </TableRow>
                        {c.id && (
                          <TableRow>
                            <TableCell sx={{ p: 0, borderBottom: 0 }} colSpan={3}>
                              <Collapse in={expandedId === c.id} unmountOnExit>
                                <CollectionModelsPanel armyCollectionId={c.id} />
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

