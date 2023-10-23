# Copyright 2021 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""A utility to compile AlphaFold inference pipelines."""

import importlib
import os

from absl import flags
from absl import app
from absl import logging
from datetime import datetime

from google.cloud import aiplatform as vertex_ai
from google.cloud import filestore_v1
from google.cloud import resourcemanager_v3

from kfp.v2 import compiler


flags.DEFINE_string('project_id', None, 'GCP project')
flags.DEFINE_string('filestore_instance_id', None, 'Filestore instance ID')
flags.DEFINE_string('filestore_instance_location',
                    None, 'Filestore instance location')
flags.DEFINE_string('filestore_share', None, 'Filestore share')
flags.DEFINE_string('pipeline_template_path', None,
                    'Path to the output JSON template')
flags.DEFINE_string('pipeline_fun', None, 'Pipeline function name')
flags.DEFINE_string('alphafold_components_image', None,
                    'AlphaFold components container image')
flags.DEFINE_string('model_params_path', None, 'GCS path to AlphaFold params')
flags.DEFINE_enum('predict_gpu', 'nvidia-tesla-t4', ['nvidia-tesla-t4', 'nvidia-tesla-a100'],
                  'GPU type for prediction')
flags.DEFINE_enum('relax_gpu', 'nvidia-tesla-t4', ['nvidia-tesla-t4', 'nvidia-tesla-a100'],
                    'GPU type for relaxation')
flags.DEFINE_string('data_pipeline_machine_type', 'c2-standard-16',
                    'Machine type to run the data pipeline on')
flags.mark_flag_as_required('project_id')
flags.mark_flag_as_required('filestore_instance_id')
flags.mark_flag_as_required('filestore_instance_location')
flags.mark_flag_as_required('filestore_share')
flags.mark_flag_as_required('pipeline_template_path')
flags.mark_flag_as_required('pipeline_fun')
flags.mark_flag_as_required('model_params_path')
FLAGS = flags.FLAGS


def _get_fun_by_name(fun_string: str):
    """Utility to get the function name from str"""
    mod_name, fun_name = fun_string.rsplit('.', 1)
    mod = importlib.import_module(mod_name)
    func = getattr(mod, fun_name)

    return func, fun_name


def get_filestore_info(project_id: str, instance_id: str, location: str):
    """Returns the IP address and the full network name of a given Filestore"""
    client = resourcemanager_v3.ProjectsClient()
    response = client.get_project(name=f'projects/{project_id}')
    project_number = response.name.split('/')[1]

    client = filestore_v1.CloudFilestoreManagerClient()
    instance_name = f'projects/{project_id}/locations/{location}/instances/{instance_id}'
    response = client.get_instance(name=instance_name)
    network = response.networks[0].network
    network = network.replace(project_id, project_number, 1)

    return response.networks[0].ip_addresses[0], network


def _main(argv):
    """Compiles the kubeflow pipeline"""
    ip_address, network = get_filestore_info(FLAGS.project_id,
                                              FLAGS.filestore_instance_id,
                                              FLAGS.filestore_instance_location)

    os.environ['ALPHAFOLD_COMPONENTS_IMAGE'] = FLAGS.alphafold_components_image
    os.environ['NFS_SERVER'] = ip_address
    os.environ['NFS_PATH'] = FLAGS.filestore_share
    os.environ['NETWORK'] = network
    os.environ['MODEL_PARAMS_GCS_LOCATION'] = FLAGS.model_params_path
    os.environ['DATA_PIPELINE_MACHINE_TYPE'] = FLAGS.data_pipeline_machine_type

    if FLAGS.predict_gpu == 'nvidia-tesla-a100':
        os.environ['MEMORY_LIMIT'] = '85'
        os.environ['CPU_LIMIT'] = '12'
        os.environ['GPU_LIMIT'] = '1'
        os.environ['GPU_TYPE'] = 'nvidia-tesla-a100'

    if FLAGS.relax_gpu == 'nvidia-tesla-a100':
        os.environ['RELAX_MEMORY_LIMIT'] = '85'
        os.environ['RELAX_CPU_LIMIT'] = '12'
        os.environ['RELAX_GPU_LIMIT'] = '1'
        os.environ['RELAX_GPU_TYPE'] = 'nvidia-tesla-a100'

    pipeline_func, _ = _get_fun_by_name(FLAGS.pipeline_fun)
    compiler.Compiler().compile(
        pipeline_func=pipeline_func,
        package_path=FLAGS.pipeline_template_path
    )


if __name__ == "__main__":
    app.run(_main)
