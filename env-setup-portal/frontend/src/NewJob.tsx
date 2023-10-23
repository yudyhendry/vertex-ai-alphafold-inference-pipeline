/*
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  AlertColor,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useState, useContext } from "react";
import { globalContext } from "./App";
// import { useLocation } from 'react-router-dom';

function NewJob({
  onClose
}: {
  createMode: any;
  onClose: any;
  onError: any;
}) {
  const errorSeverity: AlertColor = "error";
  const successSeverity: AlertColor = "success";

  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<any>(null);
  const [experimentId, setExperimentId] = useState("");
  const [smallBFD, setSmallBFD] = useState("");
  const [proteinType, setProteinType] = useState("");
  const [relaxation, setRelaxation] = useState("");
  const [predictionCount, setPredictionCount] = useState("");
  const [snackbarContent, setSnackbarContent] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>(errorSeverity);
  const [open, setOpen] = useState(true);

  const { accessToken } = useContext(globalContext);
  const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST ?? "";

  const handleFoldRun = () => {
    if (!accessToken) {
      setSnackbarContent("AccessToken is missing");
      setOpen(true);
      return;
    }
    if (!file) {
      setSnackbarContent(`FASTA file is missing. Please Upload a FASTA file.`);
      setOpen(true);
      return;
    }

    const formData = new FormData();
    formData.append("experimentId", experimentId);
    formData.append("smallBFD", smallBFD);
    formData.append("relaxation", relaxation);
    formData.append("proteinType", proteinType);
    formData.append("predictionCount", predictionCount);
    formData.append("file", file);

    return axios.post(`${BACKEND_HOST}/fold`, formData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "multipart/form-data",
      },
    }).then((res) => {
        setSnackbarContent(res.data);
        setSnackbarSeverity(successSeverity);
        setOpen(true);
    });
  };

  const handleCancelJob = () => {
    onClose();
  };
  const handleChange = (event: any, callback: any) => {
    callback(event.target.value);
  };

  return (
    <>
      {snackbarContent && (
        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          autoHideDuration={6000}
          key={"top" + "left"}
        >
          <Alert
            onClose={() => {
              setOpen(false);
            }}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
          >
            {snackbarContent}
          </Alert>
        </Snackbar>
      )}

      <Box
        sx={{ margin: "1rem" }}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <h2>Select the protein FASTA file to determine structure</h2>
        <Typography style={{ display: "flex", flexDirection: "row" }}>
          <Button variant="contained" component="label" disabled={false}>
            Upload FASTA
            <input
              type="file"
              hidden
              id="file-uploader-input"
              onChange={(event) => {
                const file: any = (event.target as HTMLInputElement)
                  ?.files?.[0];
                const reader = new FileReader();
                reader.onload = () => {
                  setFile(file);
                  setFileName(file.name);
                };
                if (file) {
                  reader.readAsText(file);
                }
                // uploadButtonDiv.current.style.paddingTop = 'unset';
              }}
              accept=".fasta"
            ></input>
          </Button>
        </Typography>

        <div style={{ display: "flex", margin: "5px" }}>
          {fileName ? (
            <div>
              {fileName}
              <span
                style={{ marginLeft: "5px", verticalAlign: "top" }}
                className="google-symbols"
              >
                check_circle
              </span>
            </div>
          ) : (
            "No file chosen."
          )}
        </div>
        <span style={{ width: "90%" }}>
          <TextField
            onBlur={(e) => handleChange(e, setExperimentId)}
            label="Experiment ID"
            variant="outlined"
            sx={{ width: "100%", mt: 2 }}
            size="small"
            helperText="Ex: amylase-fold-12"
          />
        </span>
        <span style={{ width: "90%" }}>
          <FormControl sx={{ mt: 2, minWidth: "100%" }} size="small">
            <InputLabel id="protein-type-select-label">Protein Type</InputLabel>
            <Select
              labelId="protein-type-select-label"
              id="proteinType"
              value={proteinType}
              label="Protein Type"
              size="small"
              onChange={(e) => handleChange(e, setProteinType)}
            >
              <MenuItem value={"monomer"}>Monomer</MenuItem>
              <MenuItem value={"multimer"}>Multimer</MenuItem>
            </Select>
          </FormControl>
        </span>
        <span style={{ width: "90%" }}>
          <FormControl sx={{ mt: 2, minWidth: "100%" }} size="small">
            <InputLabel id="small-bfd-select-label">Use Small BFD</InputLabel>
            <Select
              labelId="small-bfd-select-label"
              id="useSmallBfd"
              value={smallBFD}
              label="Use Small BFD"
              size="small"
              onChange={(e) => handleChange(e, setSmallBFD)}
            >
              <MenuItem value={"yes"}>Yes</MenuItem>
              <MenuItem value={"no"}>No</MenuItem>
            </Select>
          </FormControl>
        </span>
        <span style={{ width: "90%" }}>
          <TextField
            onBlur={(e) => handleChange(e, setPredictionCount)}
            label="Multimer Predictions per model (#)"
            sx={{ width: "100%", mt: 2 }}
            size="small"
            variant="outlined"
            helperText="Sample numbers: 3, 4, 5, 6. Ex: 3"
          />
        </span>
        <span style={{ width: "90%" }}>
          <FormControl sx={{ mt: 2, minWidth: "100%" }} size="small">
            <InputLabel id="relaxation-select-label">
              Run relaxation after folding
            </InputLabel>
            <Select
              labelId="relaxation-select-label"
              id="relaxation"
              value={relaxation}
              label="Run relaxation after folding"
              size="small"
              onChange={(e) => handleChange(e, setRelaxation)}
            >
              <MenuItem value={"yes"}>Yes</MenuItem>
              <MenuItem value={"no"}>No</MenuItem>
            </Select>
          </FormControl>
        </span>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <Button
            variant="contained"
            sx={{ marginTop: "20px", width: "200px", marginRight: "5px" }}
            onClick={handleFoldRun}
          >
            <span>Run AlphaFold</span>
          </Button>
          <Button
            variant="contained"
            sx={{ marginTop: "20px", width: "100px" }}
            onClick={handleCancelJob}
          >
            <span>Close</span>
          </Button>
        </div>
      </Box>
    </>
  );
}

export { NewJob };
