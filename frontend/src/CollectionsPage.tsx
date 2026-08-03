import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "./auth/useAuth";
import type { ArmyCollection } from "./generated";
import { createArmyCollection, getArmyCollections } from "./generated";

export default function CollectionsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [collections, setCollections] = useState<ArmyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

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
                      <TableCell>Name</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {collections.map((c) => (
                      <TableRow key={c.id || c.name}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.description}</TableCell>
                      </TableRow>
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
