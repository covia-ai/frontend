'use client'

import { Button } from "@/components/ui/button";
import { Venue,Asset } from "@/lib/covia/covialib";
import { useEffect, useState } from "react";

export default  function TestPage() {
    const [venue, setVenue] = useState<Venue>();
    const [assetIds, setAssetIds] = useState([]);
    const [assets, setAssets] = useState<Asset[]>([]);

     async function createAsset() {
        let response = await venue?.createAsset({
                      
              "name" : "Social Experiment Data Set2",
              "description": "Data set for social network analysis2 ",
              "dateCreated" : new Date(),
              "dateModified" : new Date()
  
        });
        console.log(response);
    }
    useEffect(() => {
           const venue = new Venue();
           venue.connect().then((venueObj) => {
              setVenue(venue);
              venueObj.getAssets().then(( assetsObj) => {
                setAssetIds(assetsObj);
                let assetMetadatas = new Array<Asset>();
                for(let index=0;index<assetsObj.length;index++) {
                  venueObj.getAsset(assetsObj[index]).then((assetMetadata: Asset) => {
                       assetMetadatas.push(assetMetadata);
                  })
                }
                console.log(assetMetadatas)
                setAssets(assetMetadatas);
                  console.log(assets)
              })
           })
     }, []);

   
    return (
          <div className="flex flex-col items-center justify-center m-10">
            
            <h2>Testing Page for {venue?.venueId} </h2>
            <h2>{venue?.connected && <span>Connected</span>}</h2>
            <h2>No of assets looked up {assetIds?.length}</h2>
            <div>AssetIds {assetIds && assetIds.map((assetId,index) => (
                 <div key={index}>{index} : {assetId}</div>
            ))}
            </div>
            <div>AssetMetadata {assets.map((asset,index) => (
                 <div key={index}>{index} : {asset.id} : {asset.metadata.name} : {asset.metadata.description}</div>
             ))}
            </div>
            <div><Button onClick={() => createAsset()}>Create Asset</Button></div>
            </div>     
         
    )

}